const mongoose = require('mongoose');

const videoMetadataSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  moduleIndex: {
    type: Number,
    required: true,
  },
  // Cloudflare R2 storage details
  cloudflareKey: {
    type: String,
    required: true,
    unique: true,
  },
  // Public CDN URL (from pub-xxx.r2.dev)
  cloudflareCdnUrl: {
    type: String,
    required: true,
  },
  // Cached signed URL (temporary — used for streaming)
  cloudflareSignedUrl: {
    type: String,
  },
  signedUrlExpiry: {
    type: Date,
  },
  // Video file details
  videoSize: {
    type: Number, // bytes
    default: 0,
  },
  videoDuration: {
    type: Number, // seconds
    default: 0,
  },
  videoFormat: {
    type: String,
    enum: ['mp4', 'mov', 'webm', 'avi', 'unknown'],
    default: 'unknown',
  },
  thumbnailUrl: {
    type: String, // Cloudflare image CDN URL
  },
  thumbnailKey: {
    type: String,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index to quickly find all videos for a course
videoMetadataSchema.index({ courseId: 1, moduleIndex: 1 });

module.exports = mongoose.model('VideoMetadata', videoMetadataSchema);
