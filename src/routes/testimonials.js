const express = require('express');
const {
  getTestimonials,
  submitTestimonial,
  getPendingTestimonials,
  getAllTestimonials,
  approveTestimonial,
  rejectTestimonial,
  deleteTestimonial,
} = require('../controllers/testimonialController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getTestimonials);
router.post('/', protect, submitTestimonial);
router.get('/pending', protect, authorize('admin'), getPendingTestimonials);
router.get('/all', protect, authorize('admin'), getAllTestimonials);
router.put('/:id/approve', protect, authorize('admin'), approveTestimonial);
router.put('/:id/reject', protect, authorize('admin'), rejectTestimonial);
router.delete('/:id', protect, authorize('admin'), deleteTestimonial);

module.exports = router;
