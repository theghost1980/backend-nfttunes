const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    index: true,
    required: true,
    unique: true,
  },
  full_name: {
    type: String,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  instagram: {
    type: String,
    trim: true,
  },
  twitter: {
    type: String,
    trim: true,
  },
  portfolio: {
    type: String,
    trim: true,
  },
  soundcloud: {
    type: String,
    trim: true,
  },
  avatar: String,
  banned: {
    type: Boolean,
    default: false,
  },
  ban_reason: String,
  whitelisted: {
    type: Boolean,
    default: false,
  },
  whitelist_applied: {
    type: Boolean,
    default: false,
  },
  following: {
    type: Array,
  },
  referred_by: {
    type: String,
    minlength: 3,
    maxlength: 16,
    index: true,
    default: null,
  },
  __v: { type: Number, select: false },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = mongoose.model('User', UserSchema);
