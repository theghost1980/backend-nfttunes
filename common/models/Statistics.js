const mongoose = require('mongoose');

const StatisticsSchema = new mongoose.Schema({
  users: Number,
  sales_volume: Number,
  transactions: String,
  total_transactions: Number,
  timestamp: {
    type: Date,
    required: true,
    index: true,
    default: Date.now,
  },
  __v: { type: Number, select: false },
}, {
  timestamps: false,
});

module.exports = mongoose.model('Statistics', StatisticsSchema);
