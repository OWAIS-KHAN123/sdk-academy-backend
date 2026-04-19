const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  videoUrl: String,         // Cloudflare CDN URL
  cloudflareKey: String,   // Cloudflare R2 storage key (for deletion / signed URLs)
  duration: Number,        // in seconds
  order: Number,
  thumbnail: String,       // Cloudflare image CDN URL
  thumbnailKey: String,    // Cloudflare R2 image key
});

const assignmentSchema = new mongoose.Schema({
  title: String,
  description: String,
  dueDate: Date,
  maxScore: Number,
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  instructor: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: 'General',
  },
  price: {
    type: Number,
    default: 0,
    min: 0,
  },
  isFree: {
    type: Boolean,
    default: false,
  },
  discountedPrice: {
    type: Number,
    min: 0,
  },
  thumbnail: String,
  thumbnailKey: String,
  promotionalVideo: String,
  promotionalVideoKey: String,
  isFeatured: {
    type: Boolean,
    default: false,
  },
  modules: [moduleSchema],
  assignments: [assignmentSchema],
  totalMaterials: {
    type: Number,
    default: 0,
  },
  cloudflareStorageUsed: {
    type: Number, // total bytes stored in Cloudflare R2 for this course
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Update totalMaterials when modules change
courseSchema.pre('save', function(next) {
  this.totalMaterials = this.modules.length + this.assignments.length;
  next();
});

// Index for search
courseSchema.index({ title: 'text', description: 'text', instructor: 'text' });

module.exports = mongoose.model('Course', courseSchema);
