const mongoose = require('mongoose');

const MarketSchema = new mongoose.Schema({
  series: {
    type: String,
    unique: true,
  },
  price: Number,
  symbol: {
    type: String,
    uppercase: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  last_updated: {
    type: Date,
    index: true,
  },
  __v: { type: Number, select: false },
}, {
  timestamps: false,
});

module.exports = mongoose.model('Market', MarketSchema);
