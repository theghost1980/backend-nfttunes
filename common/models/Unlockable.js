const mongoose = require('mongoose');

const UnlockableSchema = new mongoose.Schema({
  series: {
    type: String,
    index: true,
  },
  creator: String,
  key: {
    type: String,
  },
  filename: String,
  text: String,
  __v: { type: Number, select: false },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Unlockable', UnlockableSchema);
