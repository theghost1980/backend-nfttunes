/* eslint-disable no-param-reassign */
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  account: {
    type: String,
    index: true,
  },
  type: {
    type: String,
    index: true,
  },
  data: String,
  read: {
    type: Boolean,
    default: false,
  },
  timestamp: { type: Date, default: Date.now },
  __v: { type: Number, select: false },
}, {
  timestamps: false,
});

NotificationSchema.set('toObject', {
  virtuals: true,
  transform(doc, ret) { delete ret._id; },
});

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) { delete ret._id; },
});

module.exports = mongoose.model('Notification', NotificationSchema);
