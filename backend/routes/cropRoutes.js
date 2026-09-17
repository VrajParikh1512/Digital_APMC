import express from 'express';
import Crop from '../models/Crop.js';
import { protect, farmerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all crops (with search and filter)
// @route   GET /api/crops
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { search, minQty, maxPrice, farmerId } = req.query;
    let query = {};

    if (search) {
      query.cropName = { $regex: search, $options: 'i' };
    }
    if (minQty) {
      query.quantity = { $gte: Number(minQty) };
    }
    if (maxPrice) {
      query.price = { $lte: Number(maxPrice) };
    }
    if (farmerId) {
      query.farmer = farmerId;
    }

    const crops = await Crop.find(query).populate('farmer', 'name email');
    res.json(crops);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Create a crop listing
// @route   POST /api/crops
// @access  Protected (Farmer Only)
router.post('/', protect, farmerOnly, async (req, res) => {
  try {
    const { cropName, quantity, price, location, description, image } = req.body;

    const crop = new Crop({
      farmer: req.user._id,
      cropName,
      quantity,
      price,
      location,
      description,
      image: image || undefined // let default take over if not provided
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
    const { cropName, quantity, price, location, description, image } = req.body;

    const crop = await Crop.findById(req.params.id);

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Check if the crop belongs to the user
    if (crop.farmer.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to update this crop' });
    }

    crop.cropName = cropName || crop.cropName;
    crop.quantity = quantity || crop.quantity;
    crop.price = price || crop.price;
    crop.location = location || crop.location;
    crop.description = description || crop.description;
    
    if (image) {
      crop.image = image;
    }

    const updatedCrop = await crop.save();
    res.json(updatedCrop);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
