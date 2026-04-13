const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  progress: {
    completedModules: [{
      type: Number,
    }],
    inProgressModules: [{
      moduleIndex: Number,
      lastPosition: Number, // in seconds
    }],
    overallPercentage: {
      type: Number,
      default: 0,
    },
    totalTimeSpent: {
      type: Number,
      default: 0, // in seconds
    },
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'suspended'],
    default: 'active',
  },
  completionDate: Date,
  receiptNumber: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvalDate: Date,
}, {
  timestamps: true,
});

// Compound index to prevent duplicate enrollments
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
