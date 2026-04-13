const express = require('express');
const {
  getTestimonials,
  submitTestimonial,
  getPendingTestimonials,
  approveTestimonial,
  rejectTestimonial,
} = require('../controllers/testimonialController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getTestimonials);
router.post('/', protect, submitTestimonial);
router.get('/pending', protect, authorize('admin'), getPendingTestimonials);
router.put('/:id/approve', protect, authorize('admin'), approveTestimonial);
router.put('/:id/reject', protect, authorize('admin'), rejectTestimonial);

module.exports = router;
