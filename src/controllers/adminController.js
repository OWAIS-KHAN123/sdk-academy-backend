const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const { getStorageStats } = require('../config/cloudflare');

// ─────────────────────────────────────────────
// @desc    Dashboard stats
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      revenueResult,
      pendingPayments,
      recentUsers,
      recentEnrollments,
    ] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      Course.countDocuments({ isActive: true }),
      Enrollment.countDocuments({ status: 'active' }),
      Payment.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.countDocuments({ status: 'pending' }),
      User.find({ role: 'student' })
        .sort('-createdAt')
        .limit(5)
        .select('name email createdAt organizationalCode isActive'),
      Enrollment.find()
        .sort('-createdAt')
        .limit(5)
        .populate('userId', 'name email')
        .populate('courseId', 'title'),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalRevenue: revenueResult[0]?.total || 0,
        pendingPayments,
      },
      recentUsers,
      recentEnrollments,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get all users (paginated + searchable)
// @route   GET /api/v1/admin/users
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, role = 'student' } = req.query;

    const query = { role };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organizationalCode: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, count] = await Promise.all([
      User.find(query)
        .sort('-createdAt')
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select('-password'),
      User.countDocuments(query),
    ]);

    res.status(200).json({ success: true, count, users });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Suspend a user
// @route   PUT /api/v1/admin/users/:id/suspend
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.suspendUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, userId: user._id, isActive: false, user });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Unsuspend a user
// @route   PUT /api/v1/admin/users/:id/unsuspend
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.unsuspendUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, userId: user._id, isActive: true, user });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Manually enroll a user in a course
// @route   POST /api/v1/admin/users/:id/enroll
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.manualEnroll = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const userId = req.params.id;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId),
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const existing = await Enrollment.findOne({ userId, courseId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User is already enrolled in this course' });
    }

    const enrollment = await Enrollment.create({
      userId,
      courseId,
      approvedBy: req.user.id,
      approvalDate: new Date(),
      receiptNumber: `MANUAL-${Date.now()}`,
      status: 'active',
    });

    res.status(201).json({ success: true, enrollment });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Cloudflare R2 storage stats
// @route   GET /api/v1/admin/cloudflare/storage
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.getCloudflareStorage = async (req, res, next) => {
  try {
    const [videoStats, imageStats] = await Promise.all([
      getStorageStats('video'),
      getStorageStats('image'),
    ]);

    res.status(200).json({
      success: true,
      videos: {
        count: videoStats.totalObjects,
        sizeBytes: videoStats.totalSize,
        sizeMB: parseFloat((videoStats.totalSize / (1024 * 1024)).toFixed(2)),
      },
      images: {
        count: imageStats.totalObjects,
        sizeBytes: imageStats.totalSize,
        sizeMB: parseFloat((imageStats.totalSize / (1024 * 1024)).toFixed(2)),
      },
      totalSizeMB: parseFloat(
        ((videoStats.totalSize + imageStats.totalSize) / (1024 * 1024)).toFixed(2)
      ),
    });
  } catch (error) {
    next(error);
  }
};
