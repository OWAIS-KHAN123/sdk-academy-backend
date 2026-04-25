const Testimonial = require('../models/Testimonial');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// @desc    Get approved testimonials
// @route   GET /api/v1/testimonials
// @access  Public
exports.getTestimonials = async (req, res, next) => {
  try {
    const { courseId } = req.query;

    const query = { status: 'approved' };
    if (courseId) {
      query.courseId = courseId;
    }

    const testimonials = await Testimonial.find(query)
      .populate('userId', 'name profileImage')
      .populate('courseId', 'title')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: testimonials.length,
      testimonials,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit testimonial
// @route   POST /api/v1/testimonials
// @access  Private
exports.submitTestimonial = async (req, res, next) => {
  try {
    const { courseId, rating, reviewText } = req.body;

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId,
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'You must be enrolled in the course to submit a review',
      });
    }

    // Check if already reviewed
    const existingReview = await Testimonial.findOne({
      userId: req.user.id,
      courseId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course',
      });
    }

    const testimonial = await Testimonial.create({
      userId: req.user.id,
      courseId,
      rating,
      reviewText,
    });

    res.status(201).json({
      success: true,
      message: 'Testimonial submitted for review',
      testimonial,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending testimonials
// @route   GET /api/v1/testimonials/pending
// @access  Private/Admin
exports.getPendingTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find({ status: 'pending' })
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort('-submittedAt');

    res.status(200).json({
      success: true,
      count: testimonials.length,
      testimonials,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve testimonial
// @route   PUT /api/v1/testimonials/:id/approve
// @access  Private/Admin
exports.approveTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
    }

    testimonial.status = 'approved';
    testimonial.moderatedBy = req.user.id;
    testimonial.moderatedAt = Date.now();
    await testimonial.save();

    // Update course rating
    const course = await Course.findById(testimonial.courseId);
    const allRatings = await Testimonial.find({
      courseId: testimonial.courseId,
      status: 'approved',
    });

    const totalRating = allRatings.reduce((sum, t) => sum + t.rating, 0);
    course.rating = totalRating / allRatings.length;
    course.totalRatings = allRatings.length;
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Testimonial approved',
      testimonial,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject testimonial
// @route   PUT /api/v1/testimonials/:id/reject
// @access  Private/Admin
exports.rejectTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
    }

    const wasApproved = testimonial.status === 'approved';
    testimonial.status = 'rejected';
    testimonial.moderatedBy = req.user.id;
    testimonial.moderatedAt = Date.now();
    await testimonial.save();

    if (wasApproved) {
      const course = await Course.findById(testimonial.courseId);
      if (course) {
        const allRatings = await Testimonial.find({ courseId: testimonial.courseId, status: 'approved' });
        course.rating = allRatings.length ? allRatings.reduce((s, t) => s + t.rating, 0) / allRatings.length : 0;
        course.totalRatings = allRatings.length;
        await course.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Testimonial rejected',
      testimonial,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all testimonials (admin)
// @route   GET /api/v1/testimonials/all
// @access  Private/Admin
exports.getAllTestimonials = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const testimonials = await Testimonial.find(query)
      .populate('userId', 'name email profileImage')
      .populate('courseId', 'title')
      .sort('-submittedAt');

    res.status(200).json({
      success: true,
      count: testimonials.length,
      testimonials,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete testimonial
// @route   DELETE /api/v1/testimonials/:id
// @access  Private/Admin
exports.deleteTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    const wasApproved = testimonial.status === 'approved';
    const courseId = testimonial.courseId;
    await testimonial.deleteOne();

    if (wasApproved) {
      const course = await Course.findById(courseId);
      if (course) {
        const allRatings = await Testimonial.find({ courseId, status: 'approved' });
        course.rating = allRatings.length ? allRatings.reduce((s, t) => s + t.rating, 0) / allRatings.length : 0;
        course.totalRatings = allRatings.length;
        await course.save();
      }
    }

    res.status(200).json({ success: true, message: 'Testimonial deleted' });
  } catch (error) {
    next(error);
  }
};
