// IMPORTANT: this must be the first import so .env is loaded before the
// route files read process.env (e.g. PREDICT_API_URL, PYTHON_EXECUTABLE).
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import cropRoutes from './routes/cropRoutes.js';
import marketPriceRoutes from './routes/marketPriceRoutes.js';
import pricePredictionRoutes from './routes/pricePredictionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Stop early with a clear message if the .env file is missing or incomplete
const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing in backend/.env: ${missing.join(', ')}`);
  console.error('Copy backend/.env.example to backend/.env and fill in the values.');
  process.exit(1);
}

const app = express();

// Set limit high for base64 image uploads
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/market-prices', marketPriceRoutes);
app.use('/api/price-prediction', pricePredictionRoutes);
app.use('/api/admin', adminRoutes);

// Unknown /api URL -> JSON 404 instead of an HTML page
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

// Last-resort error handler (e.g. image too large, bad JSON)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.type === 'entity.too.large' ? 'Image is too large. Please use a smaller photo.' : err.message;
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;

// Connect to the database first, then start accepting requests
try {
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
} catch (error) {
  console.error(`MongoDB connection failed: ${error.message}`);
  process.exit(1);
}
