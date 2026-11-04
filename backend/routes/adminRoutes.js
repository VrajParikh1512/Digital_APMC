import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Total users, grouped by role (Farmer / Business Owner / Admin)
// @route   GET /api/admin/user-stats
// @access  Admin only
router.get('/user-stats', protect, adminOnly, async (req, res) => {
  try {
    const grouped = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);

    const byRole = { Farmer: 0, 'Business Owner': 0, Admin: 0 };
    grouped.forEach(g => { byRole[g._id] = g.count; });

    res.json({
      total: Object.values(byRole).reduce((a, b) => a + b, 0),
      byRole,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
