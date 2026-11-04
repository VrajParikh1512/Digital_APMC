import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Checks the JWT token and attaches the logged-in user to req.user
export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`JWT Auth Error: ${error.message}`);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const farmerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Farmer') return next();
  res.status(403).json({ message: 'Not authorized, Farmers only' });
};

export const businessOwnerOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'Business Owner' || req.user.role === 'Admin')) return next();
  res.status(403).json({ message: 'Not authorized, Business Owners only' });
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') return next();
  res.status(403).json({ message: 'Not authorized, Admins only' });
};

// For service-to-service calls (the notification microservice).
// The caller must send the header:  x-internal-key: <INTERNAL_API_KEY>
export const internalOnly = (req, res, next) => {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) {
    return res.status(503).json({ message: 'INTERNAL_API_KEY is not configured on the server' });
  }
  if (req.headers['x-internal-key'] !== expected) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
