const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const VideoMetadata = require('../models/VideoMetadata');
const { uploadToR2, deleteFromR2 } = require('../config/cloudflare');

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

// @desc    Get featured courses
// @route   GET /api/v1/courses/featured
// @access  Public
exports.getFeaturedCourse = async (req, res, next) => {
  try {
    const courses = await Course.find({ isFeatured: true, isActive: true })
      .populate('createdBy', 'name')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      courses,
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
      const { url, key } = await uploadToR2(req.files.thumbnail[0], 'thumbnails', 'image');
      req.body.thumbnail = url;
      req.body.thumbnailKey = key;
    }

    // Upload promotional video if provided
    if (req.files && req.files.promotionalVideo) {
      const { url, key } = await uploadToR2(
        req.files.promotionalVideo[0],
        'promotional-videos',
        'video'
      );
      req.body.promotionalVideo = url;
      req.body.promotionalVideoKey = key;
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

    // Upload new thumbnail if provided
    if (req.files && req.files.thumbnail) {
      // Delete old thumbnail from R2 if it exists
      if (course.thumbnailKey) {
        try { await deleteFromR2(course.thumbnailKey, 'image'); } catch (_) {}
      }
      const { url, key } = await uploadToR2(req.files.thumbnail[0], 'thumbnails', 'image');
      req.body.thumbnail = url;
      req.body.thumbnailKey = key;
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

    // Upload video to Cloudflare R2
    if (req.file) {
      const { url, key } = await uploadToR2(req.file, 'course-videos', 'video');
      req.body.videoUrl = url;
      req.body.cloudflareKey = key;

      // Save VideoMetadata record
      const moduleIndex = course.modules.length; // will be pushed next
      await VideoMetadata.create({
        courseId: course._id,
        moduleIndex,
        cloudflareKey: key,
        cloudflareCdnUrl: url,
        videoSize: req.file.size || 0,
        videoFormat: (req.file.mimetype || '').split('/')[1] || 'unknown',
        uploadedBy: req.user.id,
      });

      // Update storage usage on course
      course.cloudflareStorageUsed = (course.cloudflareStorageUsed || 0) + (req.file.size || 0);
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
