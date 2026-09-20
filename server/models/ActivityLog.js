const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  userName: {
    type: String,
    trim: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  details: {
    type: String,
    default: '',
    trim: true,
  },
  ip: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
