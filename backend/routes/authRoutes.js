import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only these roles can be chosen at signup. Admins are created with:  npm run create-admin
const SIGNUP_ROLES = ['Farmer', 'Business Owner'];

// Keep phone numbers in one format: 10 digits (removes spaces, +91, dashes)
const normalisePhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  phoneNumber: user.phoneNumber,
  role: user.role,
  token: generateToken(user._id),
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const phoneNumber = normalisePhone(req.body.phoneNumber);
    const { password, role } = req.body;

    if (!name || !phoneNumber || !password || !role) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }
    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!SIGNUP_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Choose Farmer or Business Owner' });
    }

    const userExists = await User.findOne({ phoneNumber });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, phoneNumber, password, role });
    res.status(201).json(userResponse(user));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const rawPhone = String(req.body.phoneNumber || '').trim();
    const { password } = req.body;

    if (!rawPhone || !password) {
      return res.status(400).json({ message: 'Please enter phone number and password' });
    }

    // Also match the raw value so accounts created before normalisation still work
    const user = await User.findOne({
      phoneNumber: { $in: [rawPhone, normalisePhone(rawPhone)] },
    });

    if (user && (await user.matchPassword(password))) {
      res.json(userResponse(user));
    } else {
      res.status(401).json({ message: 'Invalid phone number or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, (req, res) => {
  res.json(req.user);
});

export default router;
