const mongoose = require('mongoose');
const { addDays } = require('date-fns');
const { ULID } = require('../helpers');
const config = require('../config');

const RefreshTokenSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: ULID,
  },
  username: {
    type: String,
    index: true,
    required: true,
    lowercase: true,
  },
  token: {
    type: String,
    index: true,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  revoked_at: Date,
  expires_at: {
    type: Date,
    default: addDays(Date.now(), parseFloat(config.REFRESH_TOKEN_EXPIRATION)),
  },
  ip: String,
  country: String,
  city: String,
  browser: String,
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
