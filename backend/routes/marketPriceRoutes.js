import express from 'express';
import MarketPrice from '../models/MarketPrice.js';
import { protect, farmerOnly, adminOnly } from '../middleware/authMiddleware.js';
import { runImport } from '../scripts/importMarketPrices.js';

const router = express.Router();

// ─── Fast In-Memory Metadata Cache ──────────────────────────────────────────
let cachedGroups = null;
let cachedStates = null;
const cachedCommoditiesByGroup = new Map();

export function clearPriceCache() {
  cachedGroups = null;
  cachedStates = null;
  cachedCommoditiesByGroup.clear();
}

// ─── Public-to-Authenticated (any logged-in role) ────────────────────────────

// @desc    Get distinct commodity groups
// @route   GET /api/market-prices/groups
// @access  Protected
router.get('/groups', protect, async (req, res) => {
  try {
    if (cachedGroups && cachedGroups.length > 0) {
      return res.json(cachedGroups);
    }
    const groups = await MarketPrice.distinct('commodity_group');
    cachedGroups = groups.filter(Boolean).sort();
    res.json(cachedGroups);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @desc    Get distinct commodities, optionally filtered by group
// @route   GET /api/market-prices/commodities?group=Vegetables
// @access  Protected
router.get('/commodities', protect, async (req, res) => {
  try {
    const rawGroup = req.query.group ? req.query.group.trim() : '';
    const cacheKey = rawGroup || '__ALL__';

    if (cachedCommoditiesByGroup.has(cacheKey)) {
      return res.json(cachedCommoditiesByGroup.get(cacheKey));
    }

    const match = rawGroup ? { commodity_group: rawGroup } : {};
    const commodities = await MarketPrice.distinct('commodity', match);
    const sorted = commodities.filter(Boolean).sort();
    
    if (sorted.length > 0) {
      cachedCommoditiesByGroup.set(cacheKey, sorted);
    }
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @desc    Get distinct states
// @route   GET /api/market-prices/states
// @access  Protected
router.get('/states', protect, async (req, res) => {
  try {
    if (cachedStates && cachedStates.length > 0) {
      return res.json(cachedStates);
    }
    const states = await MarketPrice.distinct('state');
    cachedStates = states.filter(Boolean).sort();
    res.json(cachedStates);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Admin-only routes ────────────────────────────────────────────────────────

// @desc    Get import stats summary
// @route   GET /api/market-prices/stats
// @access  Admin only
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalRows = await MarketPrice.countDocuments();
    const groups    = cachedGroups || await MarketPrice.distinct('commodity_group');
    const states    = cachedStates || await MarketPrice.distinct('state');
    const oldest    = await MarketPrice.findOne({}, 'date').sort({ date: 1 }).lean();
    const newest    = await MarketPrice.findOne({}, 'date').sort({ date: -1 }).lean();

    res.json({
      totalRows,
      totalGroups:     groups.filter(Boolean).length,
      totalStates:     states.filter(Boolean).length,
      dateRange: {
        from: oldest?.date ?? null,
        to:   newest?.date ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @desc    Trigger a re-import (runs import logic as background job)
// @route   POST /api/market-prices/import
// @access  Admin only
router.post('/import', protect, adminOnly, async (req, res) => {
  try {
    clearPriceCache();
    // Respond immediately — import runs in background
    res.status(202).json({ message: 'Import started in background. Check server logs for progress.' });
    // Fire-and-forget
    runImport().catch(err => console.error('Background import error:', err.message));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @desc    Clear all price data
// @route   DELETE /api/market-prices
// @access  Admin only
router.delete('/', protect, adminOnly, async (req, res) => {
  try {
    clearPriceCache();
    const result = await MarketPrice.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount.toLocaleString()} records.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Farmer view ─────────────────────────────────────────────────────────────

// @desc    Query historical prices for a commodity, aggregated by date
// @route   GET /api/market-prices?commodity=Tomato&startDate=2024-01-01&endDate=2024-03-31&state=...
// @access  Farmer (and Admin)
router.get('/', protect, farmerOnly, async (req, res) => {
  try {
    const { commodity, startDate, endDate, state } = req.query;

    if (!commodity) {
      return res.status(400).json({ message: '`commodity` query param is required.' });
    }

    // Build match stage
    const match = {
      commodity: commodity.trim(),
    };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate)   match.date.$lte = new Date(endDate);
    }
    if (state) {
      match.state = state.trim();
    }

    // Aggregate: one record per calendar day (average across all markets/districts)
    const data = await MarketPrice.aggregate([
      { $match: match },
      {
        $group: {
          _id:             { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          avg_min_price:   { $avg: '$min_price' },
          avg_modal_price: { $avg: '$modal_price' },
          avg_max_price:   { $avg: '$max_price' },
          total_arrival:   { $sum: '$arrival_qty' },
          market_count:    { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = data.map(d => ({
      date:         d._id,
      min_price:    d.avg_min_price   != null ? +d.avg_min_price.toFixed(2)   : null,
      modal_price:  d.avg_modal_price != null ? +d.avg_modal_price.toFixed(2) : null,
      max_price:    d.avg_max_price   != null ? +d.avg_max_price.toFixed(2)   : null,
      total_arrival: d.total_arrival  != null ? +d.total_arrival.toFixed(2)   : null,
      market_count: d.market_count,
    }));

    res.json({ commodity, data: result });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
