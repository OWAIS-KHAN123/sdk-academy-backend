const express = require('express');
const {
  getCourses,
  getCourse,
  getFeaturedCourse,
  getFreeCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  addModule,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.route('/')
  .get(getCourses)
  .post(
    protect,
    authorize('admin'),
    upload.fields([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'promotionalVideo', maxCount: 1 },
    ]),
    createCourse
  );

router.get('/featured', getFeaturedCourse);
router.get('/free', getFreeCourses);

router.route('/:id')
  .get(getCourse)
  .put(protect, authorize('admin'), updateCourse)
  .delete(protect, authorize('admin'), deleteCourse);

router.post(
  '/:id/modules',
  protect,
  authorize('admin'),
  upload.single('video'),
  addModule
);

module.exports = router;
