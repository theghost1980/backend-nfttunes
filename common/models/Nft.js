const mongoose = require('mongoose');

const NFTSchema = new mongoose.Schema({
  nft_id: {
    type: Number,
    required: true,
    index: true,
    unique: true,
  },
  series: {
    type: String,
    index: true,
  },
  edition: {
    type: Number,
    index: true,
  },
  account: {
    type: String,
    index: true,
  },
  price: Number,
  symbol: String,
  fee: Number,
  for_sale: {
    type: Boolean,
    default: false,
  },
  burned: {
    type: Boolean,
    default: false,
  },
  __v: { type: Number, select: false },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = mongoose.model('NFT', NFTSchema);
