const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    default: '',
  },
  messageType: {
    type: String,
    enum: ['text', 'system', 'enrollment_approved', 'enrollment_rejected'],
    default: 'text',
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document'],
    },
    url: String,
    key: String,
  }],
  isRead: {
    type: Boolean,
    default: false,
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for efficient conversation queries
messageSchema.index({ conversationId: 1, sentAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
