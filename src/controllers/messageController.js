const Message = require('../models/Message');
const User = require('../models/User');
const { uploadToS3 } = require('../config/s3');

// Generate conversation ID
const generateConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('-');
};

// @desc    Get all conversations
// @route   GET /api/v1/messages/conversations
// @access  Private
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get unique conversation partners
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { sentAt: -1 },
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', userId] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Populate user details
    const conversations = await Promise.all(
      messages.map(async (conv) => {
        const otherUserId = conv.lastMessage.senderId.toString() === userId 
          ? conv.lastMessage.receiverId 
          : conv.lastMessage.senderId;
        
        const otherUser = await User.findById(otherUserId).select('name profileImage role');
        
        return {
          conversationId: conv._id,
          user: otherUser,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversation messages
// @route   GET /api/v1/messages/:conversationId
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ conversationId })
      .sort('-sentAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('senderId', 'name profileImage')
      .populate('receiverId', 'name profileImage');

    const count = await Message.countDocuments({ conversationId });

    res.status(200).json({
      success: true,
      count,
      messages: messages.reverse(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/v1/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;

    const conversationId = generateConversationId(senderId, receiverId);

    const attachments = [];
    if (req.file) {
      const url = await uploadToS3(req.file, 'message-attachments');
      attachments.push({
        type: req.file.mimetype.startsWith('image/') ? 'image' : 'document',
        url,
      });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      message,
      attachments,
      conversationId,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name profileImage')
      .populate('receiverId', 'name profileImage');

    // Emit socket event (will be handled in socket.io setup)
    req.app.get('io').to(receiverId).emit('new-message', populatedMessage);

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark message as read
// @route   PUT /api/v1/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (message.receiverId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    message.isRead = true;
    await message.save();

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin list for chat
// @route   GET /api/v1/messages/admins
// @access  Private
exports.getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true })
      .select('name profileImage');

    res.status(200).json({
      success: true,
      admins,
    });
  } catch (error) {
    next(error);
  }
};
