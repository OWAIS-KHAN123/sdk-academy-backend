const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// @desc    Get user enrollments
// @route   GET /api/v1/enrollments
// @access  Private
exports.getEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.id })
      .populate('courseId')
      .sort('-purchaseDate');

    res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enrollment details
// @route   GET /api/v1/enrollments/:courseId
// @access  Private
exports.getEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId: req.params.courseId,
    }).populate('courseId');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    res.status(200).json({
      success: true,
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course progress
// @route   POST /api/v1/enrollments/:courseId/progress
// @access  Private
exports.updateProgress = async (req, res, next) => {
  try {
    const { moduleIndex, lastPosition, isCompleted } = req.body;

    const enrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId: req.params.courseId,
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    const course = await Course.findById(req.params.courseId);

    if (isCompleted && !enrollment.progress.completedModules.includes(moduleIndex)) {
      enrollment.progress.completedModules.push(moduleIndex);
      
      // Remove from in-progress
      enrollment.progress.inProgressModules = enrollment.progress.inProgressModules.filter(
        m => m.moduleIndex !== moduleIndex
      );
    } else if (!isCompleted) {
      // Update in-progress
      const inProgressIndex = enrollment.progress.inProgressModules.findIndex(
        m => m.moduleIndex === moduleIndex
      );

      if (inProgressIndex > -1) {
        enrollment.progress.inProgressModules[inProgressIndex].lastPosition = lastPosition;
      } else {
        enrollment.progress.inProgressModules.push({
          moduleIndex,
          lastPosition,
        });
      }
    }

    // Calculate overall percentage
    const totalModules = course.modules.length;
    const completedCount = enrollment.progress.completedModules.length;
    enrollment.progress.overallPercentage = Math.round((completedCount / totalModules) * 100);

    // Check if course is completed
    if (enrollment.progress.overallPercentage === 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completionDate = Date.now();
    }

    await enrollment.save();

    res.status(200).json({
      success: true,
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};
