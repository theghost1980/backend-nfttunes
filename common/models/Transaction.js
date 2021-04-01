const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  account: {
    type: String,
    index: true,
  },
  counterparty: {
    type: String,
    index: true,
  },
  type: {
    type: String,
    index: true,
  },
  series: {
    type: String,
    index: true,
  },
  data: String,
  chain_block: Number,
  sidechain_block: Number,
  trx_id: {
    type: String,
    index: true,
  },
  timestamp: { type: Date, default: Date.now, index: true },
  __v: { type: Number, select: false },
}, {
  timestamps: false,
});

TransactionSchema.index({ account: 1, type: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
