const express = require('express');
const {
  getEnrollments,
  getEnrollment,
  updateProgress,
} = require('../controllers/enrollmentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getEnrollments);
router.get('/:courseId', getEnrollment);
router.post('/:courseId/progress', updateProgress);

module.exports = router;
