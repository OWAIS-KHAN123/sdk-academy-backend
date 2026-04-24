const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const notifications = await Notification.find({ userId: req.user.id })
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send notification (Admin) — single user or bulk broadcast
// @route   POST /api/v1/notifications/send
// @access  Private/Admin
exports.sendNotification = async (req, res, next) => {
  try {
    const { userId, title, message, type, referenceId, courseId, bulk } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({ success: false, message: 'title, message and type are required' });
    }

    const ref = referenceId || courseId || undefined;
    const io = req.app.get('io');

    if (bulk) {
      const users = await User.find({ isActive: true, role: 'student' }).select('_id');
      if (users.length === 0) {
        return res.status(200).json({ success: true, count: 0, message: 'No active students found' });
      }

      const docs = users.map((u) => ({
        userId: u._id,
        title,
        message,
        type,
        ...(ref && { referenceId: ref }),
      }));

      await Notification.insertMany(docs);

      users.forEach((u) => {
        try { io.to(u._id.toString()).emit('new-notification', { title, message, type }); } catch {}
      });

      return res.status(201).json({ success: true, count: users.length });
    }

    // Individual
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required for individual notification' });
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      ...(ref && { referenceId: ref }),
    });

    try { io.to(userId.toString()).emit('new-notification', notification); } catch {}

    res.status(201).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};
