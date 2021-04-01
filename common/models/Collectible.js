const mongoose = require('mongoose');
const { CATEGORIES } = require('../config');

const CollectibleSchema = new mongoose.Schema({
  creator: {
    type: String,
    index: true,
  },
  name: {
    type: String,
    require: true,
  },
  collection_name: {
    type: String,
    require: true,
  },
  series: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: CATEGORIES,
    required: true,
  },
  rights: {
    type: Number,
    required: true,
    enum: [0, 1, 2, 3],
  },
  editions: {
    type: Number,
    required: true,
  },
  nsfw: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ['audio', 'video'],
  },
  thumbnail: {
    type: String,
    required: true,
  },
  file: {
    type: String,
    required: true,
  },
  tags: [String],
  description: String,
  notes: String,
  published: {
    type: Boolean,
    default: true,
  },
  featured: {
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

CollectibleSchema.index({
  name: 'text', category: 'text', creator: 'text', description: 'text', tags: 'text',
}, { background: true });

module.exports = mongoose.model('Collectible', CollectibleSchema);
