const Message = require('../models/Message');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const { uploadToR2 } = require('../config/cloudflare');

const generateConversationId = (id1, id2) => [id1.toString(), id2.toString()].sort().join('-');

// @route   GET /api/v1/messages/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const groups = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { 'lastMessage.sentAt': -1 } },
    ]);

    const conversations = await Promise.all(
      groups.map(async (g) => {
        const lm = g.lastMessage;
        const otherUserId = lm.senderId.toString() === userId.toString()
          ? lm.receiverId
          : lm.senderId;
        const otherUser = await User.findById(otherUserId).select('name profileImage role email');
        return {
          conversationId: g._id,
          otherUser,
          lastMessage: lm,
          unreadCount: g.unreadCount,
        };
      })
    );

    res.status(200).json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/v1/messages/:conversationId
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    const messages = await Message.find({ conversationId })
      .sort('-sentAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('senderId', 'name profileImage')
      .populate('receiverId', 'name profileImage');

    const count = await Message.countDocuments({ conversationId });

    // Mark unread messages from other user as read
    await Message.updateMany(
      { conversationId, receiverId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, count, messages: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/v1/messages
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, message, conversationId: clientConvId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }

    const conversationId = clientConvId || generateConversationId(senderId, receiverId);

    const attachments = [];
    if (req.file) {
      const { url } = await uploadToR2(req.file, 'message-attachments', 'image');
      attachments.push({ type: 'image', url });
    }

    if (!message?.trim() && attachments.length === 0) {
      return res.status(400).json({ success: false, message: 'Message or attachment required' });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      message: message?.trim() || '',
      attachments,
      conversationId,
      messageType: attachments.length > 0 && !message?.trim() ? 'text' : 'text',
    });

    const populated = await Message.findById(newMessage._id)
      .populate('senderId', 'name profileImage')
      .populate('receiverId', 'name profileImage');

    req.app.get('io').to(receiverId.toString()).emit('new-message', populated);

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/v1/messages/approve
// @access  Admin only
exports.approveEnrollment = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { studentId, courseId, receiptNumber, conversationId, screenshotUrl } = req.body;

    if (!studentId || !courseId || !receiptNumber) {
      return res.status(400).json({ success: false, message: 'studentId, courseId, receiptNumber required' });
    }

    const [student, course] = await Promise.all([
      User.findById(studentId),
      Course.findById(courseId),
    ]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Check for duplicate enrollment
    const existing = await Enrollment.findOne({ userId: studentId, courseId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Student already enrolled in this course' });
    }

    // Check duplicate receipt
    const dupReceipt = await Payment.findOne({ receiptNumber });
    if (dupReceipt) {
      return res.status(400).json({ success: false, message: 'Receipt number already used' });
    }

    // Create enrollment
    await Enrollment.create({
      userId: studentId,
      courseId,
      receiptNumber,
      approvedBy: req.user.id,
      approvalDate: new Date(),
      status: 'active',
    });

    // Create payment record
    await Payment.create({
      userId: studentId,
      courseId,
      amount: course.discountedPrice || course.price || 0,
      receiptNumber,
      screenshotUrl: screenshotUrl || 'chat-approved',
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: req.user.id,
    });

    // Send system message in the conversation
    const convId = conversationId || generateConversationId(req.user.id, studentId);
    const systemMsg = await Message.create({
      senderId: req.user.id,
      receiverId: studentId,
      message: `✅ Your enrollment for "${course.title}" has been approved! You can now access all course content.`,
      conversationId: convId,
      messageType: 'enrollment_approved',
    });

    const populated = await Message.findById(systemMsg._id)
      .populate('senderId', 'name profileImage')
      .populate('receiverId', 'name profileImage');

    req.app.get('io').to(studentId.toString()).emit('new-message', populated);

    res.status(200).json({ success: true, message: populated, courseTitle: course.title });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/v1/messages/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    if (message.receiverId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    message.isRead = true;
    await message.save();
    res.status(200).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/v1/messages/admins
exports.getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('name profileImage email');
    res.status(200).json({ success: true, admins });
  } catch (error) {
    next(error);
  }
};
