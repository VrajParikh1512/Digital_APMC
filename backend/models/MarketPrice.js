import mongoose from 'mongoose';

const marketPriceSchema = new mongoose.Schema({
  state:           { type: String, index: true },
  district:        { type: String },
  commodity_group: { type: String, index: true },
  commodity:       { type: String, index: true },
  date:            { type: Date,   index: true },
  min_price:       { type: Number },
  modal_price:     { type: Number },
  max_price:       { type: Number },
  price_unit:      { type: String },
  arrival_qty:     { type: Number },
  arrival_unit:    { type: String },
  msp:             { type: Number },
}, { timestamps: false });

// Compound indexes for the most common query patterns
marketPriceSchema.index({ commodity: 1, date: 1 });
marketPriceSchema.index({ commodity: 1, state: 1, date: 1 });

const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema);

export default MarketPrice;
