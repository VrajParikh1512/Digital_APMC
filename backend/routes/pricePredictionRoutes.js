import express from 'express';
import MarketPrice from '../models/MarketPrice.js';
import { protect, farmerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// The Python FastAPI service URL — can be overridden via env
const PREDICT_API_URL = process.env.PREDICT_API_URL || 'http://localhost:8000';

// ─── Commodity group mapping (matches LightGBM training) ────────────────────
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

/**
 * @desc  Check if the Python prediction service is healthy
 * @route GET /api/price-prediction/health
 * @access Protected (any logged-in role)
 */
router.get('/health', protect, async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000);
    const upstream   = await fetch(`${PREDICT_API_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await upstream.json();
    res.status(upstream.ok ? 200 : 503).json(data);
  } catch (err) {
    res.status(503).json({
      status:  'unreachable',
      detail:  'Price-prediction service is not running.',
      hint:    'Start it with: uvicorn api:app --host 0.0.0.0 --port 8000',
    });
  }
});

/**
 * @desc  Fetch recent price history for a commodity + state + district + market from MongoDB,
 *        then forward it to the Python LightGBM service for forecasting.
 * @route POST /api/price-prediction/predict
 * @access Protected (Farmer)
 *
 * Body: {
 *   commodity:       string,
 *   commodity_group: string,
 *   state:           string,
 *   district:        string  (optional, defaults to "Unknown")
 *   market:          string  (optional, defaults to "Unknown")
 *   history_days:    number  (optional, 14–90, default 30)
 * }
 */
router.post('/predict', protect, farmerOnly, async (req, res) => {
  try {
    const {
      commodity,
      commodity_group,
      state,
      district  = 'Unknown',
      market    = 'Unknown',
      history_days = 30,
    } = req.body;

    // ── Validate inputs ────────────────────────────────────────────────────
    if (!commodity || !commodity_group || !state) {
      return res.status(400).json({
        message: '`commodity`, `commodity_group`, and `state` are required.',
      });
    }
    if (!COMMODITY_GROUP_MAP[commodity_group]) {
      return res.status(400).json({
        message: `Invalid commodity_group. Allowed: ${Object.keys(COMMODITY_GROUP_MAP).join(', ')}`,
      });
    }
    const days = Math.min(90, Math.max(14, Number(history_days) || 30));

    // ── Pull recent daily-aggregated prices from MongoDB ───────────────────
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const matchStage = {
      commodity:       { $regex: new RegExp(`^${commodity.trim()}$`, 'i') },
      commodity_group: { $regex: new RegExp(`^${commodity_group.trim()}$`, 'i') },
      state:           { $regex: new RegExp(`^${state.trim()}$`, 'i') },
      date:            { $gte: sinceDate },
    };

    // If a specific district and/or market was requested, narrow the query
    if (district && district !== 'Unknown') {
      matchStage.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
    }
    if (market && market !== 'Unknown') {
      matchStage.market = { $regex: new RegExp(`^${market.trim()}$`, 'i') };
    }

    // Aggregate to one record per calendar day
    const rawHistory = await MarketPrice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id:             { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          modal_price:     { $avg: '$modal_price' },
          min_price:       { $avg: '$min_price' },
          max_price:       { $avg: '$max_price' },
          arrival_quantity: { $sum: '$arrival_qty' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    if (rawHistory.length < 2) {
      return res.status(422).json({
        message:
          'Not enough historical data to generate a prediction. ' +
          'At least 2 records are required. Try selecting a broader state or date range.',
        records_found: rawHistory.length,
      });
    }

    // ── Build the payload expected by the Python service ──────────────────
    const history = rawHistory.map(r => ({
      date:             r._id,
      modal_price:      parseFloat(r.modal_price?.toFixed(2) ?? 0),
      arrival_quantity: r.arrival_quantity > 0 ? parseFloat(r.arrival_quantity.toFixed(2)) : null,
      min_price:        r.min_price  != null ? parseFloat(r.min_price.toFixed(2))  : null,
      max_price:        r.max_price  != null ? parseFloat(r.max_price.toFixed(2))  : null,
    })).filter(r => r.modal_price > 0);

    if (history.length < 2) {
      return res.status(422).json({
        message: 'Not enough valid price observations after filtering zero prices.',
        records_found: history.length,
      });
    }

    const predictPayload = {
      state:           state,
      district:        district,
      market:          market,
      commodity:       commodity,
      commodity_group: COMMODITY_GROUP_MAP[commodity_group],
      price_unit:      'Rs./Quintal',
      history,
    };

    // ── Call Python FastAPI ────────────────────────────────────────────────
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 30000); // 30 s
    let upstreamRes;
    try {
      upstreamRes = await fetch(`${PREDICT_API_URL}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(predictPayload),
        signal:  controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      return res.status(503).json({
        message: 'Price-prediction service is unavailable. Please try again later.',
        detail:  fetchErr.message,
      });
    }
    clearTimeout(timeout);

    const result = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({
        message: result.detail || 'Prediction service returned an error.',
      });
    }

    // ── Enrich response with the history we used ──────────────────────────
    return res.json({
      ...result,
      history_used:     history,
      history_days_requested: days,
    });
  } catch (err) {
    console.error('[price-prediction] predict error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @desc  Return districts available for a state + commodity combo
 * @route GET /api/price-prediction/districts?state=Maharashtra&commodity=Tomato
 * @access Protected (Farmer)
 */
router.get('/districts', protect, farmerOnly, async (req, res) => {
  try {
    const { state, commodity } = req.query;
    if (!state) return res.status(400).json({ message: '`state` is required.' });
    const match = {
      state: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
    };
    if (commodity) {
      match.commodity = { $regex: new RegExp(`^${commodity.trim()}$`, 'i') };
    }
    const districts = await MarketPrice.distinct('district', match);
    res.json(districts.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @desc  Return markets available for a state + district + commodity combo
 * @route GET /api/price-prediction/markets?state=Maharashtra&district=Nashik&commodity=Tomato
 * @access Protected (Farmer)
 */
router.get('/markets', protect, farmerOnly, async (req, res) => {
  try {
    const { state, district, commodity } = req.query;
    if (!state) return res.status(400).json({ message: '`state` is required.' });
    const match = {
      state: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
    };
    if (district) {
      match.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
    }
    if (commodity) {
      match.commodity = { $regex: new RegExp(`^${commodity.trim()}$`, 'i') };
    }
    const markets = await MarketPrice.distinct('market', match);
    res.json(markets.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;

