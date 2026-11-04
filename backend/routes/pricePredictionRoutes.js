import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import MarketPrice from '../models/MarketPrice.js';
import { protect, farmerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The Python FastAPI service URL (server.js loads .env before this file runs)
const PREDICT_API_URL = process.env.PREDICT_API_URL || 'http://127.0.0.1:8000';

const COMMODITY_GROUP_MAP = {
  'Cereals':     'Cereals',
  'Dry Fruits':  'Dry Fruits',
  'Fibre Crops': 'Fibre Crops',
  'Fruits':      'Fruits',
  'Oil Seeds':   'Oil Seeds',
  'Pulses':      'Pulses',
  'Spices':      'Spices',
  'Vegetables':  'Vegetables',
};

// Auto-start the Python uvicorn service, but ONLY if nothing is answering on its port.
// (start-app.bat also starts it, so we must not start a second copy.)
let pythonProcess = null;
let isSpawning = false;

async function isPythonUp() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${PREDICT_API_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensurePythonService() {
  if (pythonProcess || isSpawning) return;
  isSpawning = true;

  if (await isPythonUp()) {
    isSpawning = false;
    return;
  }

  const pythonDir = path.resolve(__dirname, '../../price-prediction');
  const pyExecutable = process.env.PYTHON_EXECUTABLE || 'python';

  try {
    pythonProcess = spawn(pyExecutable, ['-m', 'uvicorn', 'api:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: pythonDir,
      env: { ...process.env, MPLCONFIGDIR: path.join(pythonDir, '.matplotlib') },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    pythonProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('Application startup complete') || msg.includes('Uvicorn running')) {
        console.log('[PricePredictor] Python FastAPI service is active on port 8000');
      }
    });

    pythonProcess.stderr.on('data', (d) => {
      const str = d.toString();
      if (str.includes('Application startup complete') || str.includes('Uvicorn running')) {
        console.log('[PricePredictor] Python FastAPI service is active on port 8000');
      } else if (!str.includes('INFO:') && !str.includes('WARNING:')) {
        console.error('[PricePredictor]', str.trim());
      }
    });

    pythonProcess.on('error', (err) => {
      console.warn('[PricePredictor] Could not start Python service:', err.message);
      pythonProcess = null;
    });

    pythonProcess.on('exit', () => {
      pythonProcess = null;
    });
  } catch (err) {
    console.warn('[PricePredictor] Failed to start Python process:', err.message);
  } finally {
    // Wait a little before trying again so we do not start many copies
    setTimeout(() => { isSpawning = false; }, 5000);
  }
}

// Stop the Python child when the backend stops
process.on('exit', () => { if (pythonProcess) pythonProcess.kill(); });

// Attempt to start Python service on module load
ensurePythonService();

/**
 * Fallback prediction generator in pure JavaScript
 * Used if Python service is temporarily starting or offline
 */
function generateFallbackForecast(history, req) {
  const hs = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const prices = hs.map(x => Number(x.modal_price)).filter(p => Number.isFinite(p) && p > 0);
  const basePrice = prices[prices.length - 1];

  let relChange = 0;
  if (prices.length >= 2) {
    relChange = (prices[prices.length - 1] - prices[0]) / Math.max(prices[0], 1);
    relChange = Math.max(-0.35, Math.min(0.35, relChange));
  }

  const forecasts = [1, 2, 3, 7].map(h => {
    const drift = relChange * (h / 7.0) * 0.4;
    const raw = basePrice * (1 + drift);
    const predicted = Math.max(raw, 1);
    const pct = ((predicted / basePrice) - 1) * 100;
    const useBaseline = Math.abs(pct) < 5.0;
    const finalPrice = useBaseline ? basePrice : predicted;

    return {
      reporting_step: h,
      predicted_modal_price: Math.round(finalPrice * 100) / 100,
      raw_lightgbm_price: Math.round(raw * 100) / 100,
      predicted_change_pct: Math.round(pct * 100) / 100,
      used_baseline_due_to_5pct_rule: useBaseline,
      experimental: h === 7,
      recommended: [1, 2, 3].includes(h),
    };
  });

  return {
    state: req.state,
    district: req.district,
    market: req.market,
    commodity: req.commodity,
    commodity_group: req.commodity_group,
    price_unit: 'Rs./Quintal',
    last_observed_date: hs[hs.length - 1].date,
    last_modal_price: basePrice,
    recommended_horizon_reporting_steps: 3,
    forecasts,
    algorithm: 'Trend-based estimate (trained model not available)',
    engine: 'fallback',
    model_trained_through: null,
    note: 'Forecast steps represent upcoming market reporting observations. Step 7 is experimental.',
  };
}

/**
 * @desc  Check if prediction service is healthy
 * @route GET /api/price-prediction/health
 * @access Public
 */
router.get('/health', async (req, res) => {
  ensurePythonService();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const upstream = await fetch(`${PREDICT_API_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await upstream.json();
    return res.json({
      status: 'ok',
      ...data,
      service_mode: 'active',
    });
  } catch {
    // If Python service is still spinning up or not responding,
    // we still return status: 'ok' because our built-in fallback handles predictions smoothly.
    return res.json({
      status: 'ok',
      model_status: 'service_offline',
      algorithm: 'Trend-based estimate (prediction service starting)',
      service_mode: 'resilient_ready',
      price_unit: 'Rs./Quintal',
    });
  }
});

/**
 * @desc  Predict prices based on mandi history
 * @route POST /api/price-prediction/predict
 * @access Protected (Farmer)
 */
router.post('/predict', protect, farmerOnly, async (req, res) => {
  try {
    const {
      commodity,
      commodity_group,
      state,
      district = 'Unknown',
      market   = 'Unknown',
      history_days = 30,
    } = req.body;

    if (!commodity || !commodity_group || !state) {
      return res.status(400).json({
        message: '`commodity`, `commodity_group`, and `state` are required.',
      });
    }

    const normGroup = COMMODITY_GROUP_MAP[commodity_group] || commodity_group;
    const windowDays = Math.min(Math.max(Number(history_days) || 30, 7), 365);

    // Base filter: this crop, in this state
    const baseMatch = {
      commodity: commodity.trim(),
      state:     state.trim(),
      modal_price: { $gt: 0 },
    };
    if (normGroup) baseMatch.commodity_group = normGroup.trim();

    // Optional narrower filter: district / market
    const areaMatch = {};
    if (district && district !== 'Unknown') areaMatch.district = district.trim();
    if (market && market !== 'Unknown')     areaMatch.market   = market.trim();

    // One row per day (average of all matching markets), newest 60 days, then oldest -> newest.
    // Grouping by day matters: a state has many markets, so reading raw rows would
    // return only 1-2 different days and the prediction would fail.
    const loadDailyHistory = async (extraMatch) => {
      const rows = await MarketPrice.aggregate([
        { $match: { ...baseMatch, ...extraMatch } },
        {
          $group: {
            _id:              { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            modal_price:      { $avg: '$modal_price' },
            min_price:        { $avg: '$min_price' },
            max_price:        { $avg: '$max_price' },
            arrival_quantity: { $avg: '$arrival_qty' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 60 },
      ]);
      const round2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
      return rows.reverse().map(r => ({
        date:             r._id,
        modal_price:      round2(r.modal_price),
        min_price:        round2(r.min_price),
        max_price:        round2(r.max_price),
        arrival_quantity: round2(r.arrival_quantity),
      }));
    };

    let history = await loadDailyHistory(areaMatch);

    // Too little data for that district/market -> use the whole state
    if (history.length < 2 && Object.keys(areaMatch).length > 0) {
      history = await loadDailyHistory({});
    }

    // Apply the "history window" chosen by the farmer (relative to the latest record)
    if (history.length >= 2) {
      const lastDay = new Date(history[history.length - 1].date).getTime();
      const cutoff = lastDay - windowDays * 24 * 60 * 60 * 1000;
      const inWindow = history.filter(h => new Date(h.date).getTime() >= cutoff);
      if (inWindow.length >= 2) history = inWindow;
    }

    // The model only needs the latest 15 observations
    history = history.slice(-15);

    if (history.length < 2) {
      return res.status(422).json({
        message: `At least 2 historical observations are required for ${commodity} in ${state}. Found ${history.length}.`,
        records_found: history.length,
      });
    }

    const predictPayload = {
      state,
      district,
      market,
      commodity,
      commodity_group: normGroup,
      price_unit: 'Rs./Quintal',
      history,
    };

    // Try calling Python FastAPI service first
    ensurePythonService();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const upstreamRes = await fetch(`${PREDICT_API_URL}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(predictPayload),
        signal:  controller.signal,
      });
      clearTimeout(timeout);

      if (upstreamRes.ok) {
        const result = await upstreamRes.json();
        return res.json({
          engine: 'lightgbm',
          ...result, // the Python service sets "engine" itself and wins over the default above
          history_used: history,
        });
      }
    } catch {
      // Python service unreachable; gracefully fallback
    }

    // Fallback calculation ensures user always gets the prediction result
    const fallbackResult = generateFallbackForecast(history, {
      state, district, market, commodity, commodity_group: normGroup,
    });

    return res.json({
      ...fallbackResult,
      history_used: history,
    });
  } catch (err) {
    console.error('[price-prediction] predict error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const districtsCache = new Map();
const marketsCache = new Map();

/**
 * @desc  Return districts available for a state + commodity combo
 * @route GET /api/price-prediction/districts
 * @access Protected (Farmer)
 */
router.get('/districts', protect, farmerOnly, async (req, res) => {
  try {
    const { state, commodity } = req.query;
    if (!state) return res.status(400).json({ message: '`state` is required.' });
    const cacheKey = `${state.trim()}|${commodity ? commodity.trim() : ''}`;
    if (districtsCache.has(cacheKey)) {
      return res.json(districtsCache.get(cacheKey));
    }
    const match = { state: state.trim() };
    if (commodity) {
      match.commodity = commodity.trim();
    }
    const districts = await MarketPrice.distinct('district', match);
    const sorted = districts.filter(Boolean).sort();
    districtsCache.set(cacheKey, sorted);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @desc  Return markets available for a state + district + commodity combo
 * @route GET /api/price-prediction/markets
 * @access Protected (Farmer)
 */
router.get('/markets', protect, farmerOnly, async (req, res) => {
  try {
    const { state, district, commodity } = req.query;
    if (!state) return res.status(400).json({ message: '`state` is required.' });
    const cacheKey = `${state.trim()}|${district ? district.trim() : ''}|${commodity ? commodity.trim() : ''}`;
    if (marketsCache.has(cacheKey)) {
      return res.json(marketsCache.get(cacheKey));
    }
    const match = { state: state.trim() };
    if (district && district !== 'Unknown') {
      match.district = district.trim();
    }
    if (commodity) {
      match.commodity = commodity.trim();
    }
    const markets = await MarketPrice.distinct('market', match);
    const sorted = markets.filter(Boolean).sort();
    marketsCache.set(cacheKey, sorted);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
