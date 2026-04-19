const express = require('express');
const {
  uploadVideo,
  getPresignedUploadUrl,
  confirmVideoUpload,
  getStreamUrl,
  getDownloadUrl,
  generateSignedUrlEndpoint,
  deleteVideo,
  getStorageStatsEndpoint,
} = require('../controllers/videoController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Storage stats (admin only)
router.get('/storage-stats', authorize('admin'), getStorageStatsEndpoint);

// Upload video to Cloudflare R2 (admin only)
router.post(
  '/upload',
  authorize('admin'),
  upload.single('video'),
  uploadVideo
);

// Generate a signed URL on-demand (admin only)
router.post('/generate-signed-url', authorize('admin'), generateSignedUrlEndpoint);

// Presigned direct-upload flow (bypasses Vercel body limit)
router.post('/presigned-upload-url', authorize('admin'), getPresignedUploadUrl);
router.post('/confirm-upload', authorize('admin'), confirmVideoUpload);

// Get streaming URL for an enrolled user
router.get('/:videoId/stream-url', getStreamUrl);

// Get download URL for an enrolled user
router.get('/:videoId/download-url', getDownloadUrl);

// Delete video from R2 + MongoDB (admin only)
router.delete('/:videoId', authorize('admin'), deleteVideo);

module.exports = router;
