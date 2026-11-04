import express from 'express';
import mongoose from 'mongoose';
import Crop from '../models/Crop.js';
import { protect, farmerOnly, internalOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Escape special characters so a search like "a(b" cannot break the regex
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all crops (with search and filter)
// @route   GET /api/crops
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { search, minQty, maxPrice, farmerId } = req.query;
    const query = {};

    if (search && search.trim()) {
      query.cropName = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }
    if (minQty && !isNaN(minQty)) {
      query.quantity = { $gte: Number(minQty) };
    }
    if (maxPrice && !isNaN(maxPrice)) {
      query.price = { $lte: Number(maxPrice) };
    }
    if (farmerId) {
      if (!mongoose.isValidObjectId(farmerId)) {
        return res.status(400).json({ message: 'Invalid farmerId' });
      }
      query.farmer = farmerId;
    }

    const crops = await Crop.find(query)
      .sort({ createdAt: -1 })
      .populate('farmer', 'name phoneNumber');
    res.json(crops);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── Internal routes (used only by the notification microservice) ────────────

// @desc    Get crops requiring verification notifications
// @route   GET /api/crops/notifications/pending
// @access  Internal (x-internal-key header)
router.get('/notifications/pending', internalOnly, async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const staleCrops = await Crop.find({
      updatedAt: { $lte: oneWeekAgo },
      $or: [
        { lastNotificationSentAt: null },
        { lastNotificationSentAt: { $lte: oneWeekAgo } },
      ],
    }).populate('farmer', 'name phoneNumber');

    res.json(staleCrops);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Mark a crop's notification as sent
// @route   PUT /api/crops/notifications/mark-sent
// @access  Internal (x-internal-key header)
router.put('/notifications/mark-sent', internalOnly, async (req, res) => {
  try {
    const { cropIds } = req.body;
    if (!Array.isArray(cropIds)) {
      return res.status(400).json({ message: 'cropIds must be an array' });
    }
    await Crop.updateMany(
      { _id: { $in: cropIds } },
      { $set: { lastNotificationSentAt: new Date() } }
    );
    res.json({ message: 'Notifications marked as sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── Farmer routes ───────────────────────────────────────────────────────────

// Checks quantity and price are positive numbers. Returns an error text or null.
const validateNumbers = ({ quantity, price }) => {
  if (quantity !== undefined && !(Number(quantity) > 0)) return 'Quantity must be greater than 0';
  if (price !== undefined && !(Number(price) > 0)) return 'Price must be greater than 0';
  return null;
};

// @desc    Create a crop listing
// @route   POST /api/crops
// @access  Protected (Farmer Only)
router.post('/', protect, farmerOnly, async (req, res) => {
  try {
    const { cropName, quantity, price, location, description, image } = req.body;

    if (!cropName || quantity === undefined || price === undefined || !location) {
      return res.status(400).json({ message: 'Crop name, quantity, price and location are required' });
    }
    const numberError = validateNumbers({ quantity, price });
    if (numberError) return res.status(400).json({ message: numberError });

    const crop = new Crop({
      farmer: req.user._id,
      cropName: cropName.trim(),
      quantity: Number(quantity),
      price: Number(price),
      location: location.trim(),
      description,
      image: image || undefined, // let the default image take over if not provided
    });

    const createdCrop = await crop.save();
    res.status(201).json(createdCrop);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Update a crop listing
// @route   PUT /api/crops/:id
// @access  Protected (Farmer Only)
router.put('/:id', protect, farmerOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid crop id' });
    }
    const { cropName, quantity, price, location, description, image } = req.body;

    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    if (crop.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this crop' });
    }

    const numberError = validateNumbers({ quantity, price });
    if (numberError) return res.status(400).json({ message: numberError });

    if (cropName)              crop.cropName = cropName.trim();
    if (quantity !== undefined) crop.quantity = Number(quantity);
    if (price !== undefined)    crop.price = Number(price);
    if (location)              crop.location = location.trim();
    if (description !== undefined) crop.description = description;
    if (image)                 crop.image = image;

    // Saving (even with the same values) refreshes updatedAt, which the
    // "please verify your listing" reminder uses.
    crop.markModified('quantity');
    const updatedCrop = await crop.save();
    res.json(updatedCrop);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Delete a crop listing
// @route   DELETE /api/crops/:id
// @access  Protected (Farmer Only)
router.delete('/:id', protect, farmerOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid crop id' });
    }
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    if (crop.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this crop' });
    }
    await crop.deleteOne();
    res.json({ message: 'Listing deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
