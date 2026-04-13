const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { uploadToS3 } = require('../config/s3');

// @desc    Get all courses
// @route   GET /api/v1/courses
// @access  Public
exports.getCourses = async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      isFree,
      sort = '-createdAt',
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    if (isFree !== undefined) {
      query.isFree = isFree === 'true';
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Execute query
    const courses = await Course.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name');

    const count = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      courses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course
// @route   GET /api/v1/courses/:id
// @access  Public
exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user is enrolled
    let isEnrolled = false;
    if (req.user) {
      const enrollment = await Enrollment.findOne({
        userId: req.user.id,
        courseId: course._id,
      });
      isEnrolled = !!enrollment;
    }

    res.status(200).json({
      success: true,
      course,
      isEnrolled,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured course
// @route   GET /api/v1/courses/featured
// @access  Public
exports.getFeaturedCourse = async (req, res, next) => {
  try {
    const course = await Course.findOne({ isFeatured: true, isActive: true })
      .populate('createdBy', 'name');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'No featured course found',
      });
    }

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get free courses
// @route   GET /api/v1/courses/free
// @access  Public
exports.getFreeCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ isFree: true, isActive: true })
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create course
// @route   POST /api/v1/courses
// @access  Private/Admin
exports.createCourse = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;

    // Upload thumbnail if provided
    if (req.files && req.files.thumbnail) {
      req.body.thumbnail = await uploadToS3(req.files.thumbnail[0], 'thumbnails');
    }

    // Upload promotional video if provided
    if (req.files && req.files.promotionalVideo) {
      req.body.promotionalVideo = await uploadToS3(
        req.files.promotionalVideo[0],
        'promotional-videos'
      );
    }

    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/v1/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/v1/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Soft delete
    course.isActive = false;
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add module to course
// @route   POST /api/v1/courses/:id/modules
// @access  Private/Admin
exports.addModule = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Upload video
    if (req.file) {
      const videoUrl = await uploadToS3(req.file, 'course-videos');
      req.body.videoUrl = videoUrl;
    }

    course.modules.push(req.body);
    await course.save();

    res.status(201).json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};
