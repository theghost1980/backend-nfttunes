const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  maintenance: {
    type: Boolean,
    default: false,
  },
  __v: { type: Number, select: false },
}, {
  collection: 'config',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = mongoose.model('Config', ConfigSchema);
