const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  report_id: {
    type: String,
    index: true,
  },
  series: {
    type: String,
    index: true,
  },
  username: String,
  type: String,
  message: String,
  processed_by: String,
  processed: {
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

module.exports = mongoose.model('Report', ReportSchema);
