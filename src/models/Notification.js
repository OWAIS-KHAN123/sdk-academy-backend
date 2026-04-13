const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['payment', 'message', 'course', 'assignment', 'general'],
    required: true,
  },
  referenceId: mongoose.Schema.Types.ObjectId,
  isRead: {
    type: Boolean,
    default: false,
  },
  actionUrl: String,
}, {
  timestamps: true,
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
