const express = require('express');
const {
  getPromoVideos,
  getAllPromoVideos,
  createPromoVideo,
  deletePromoVideo,
  updatePromoVideo,
} = require('../controllers/promoVideoController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public — home screen fetches this
router.get('/', getPromoVideos);

// Admin only
router.get('/all', protect, authorize('admin'), getAllPromoVideos);
router.post('/', protect, authorize('admin'), createPromoVideo);
router.put('/:id', protect, authorize('admin'), updatePromoVideo);
router.delete('/:id', protect, authorize('admin'), deletePromoVideo);

module.exports = router;
