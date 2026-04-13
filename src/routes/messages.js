const express = require('express');
const {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getAdmins,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/conversations', getConversations);
router.get('/admins', getAdmins);
router.get('/:conversationId', getMessages);
router.post('/', upload.single('attachment'), sendMessage);
router.put('/:id/read', markAsRead);

module.exports = router;
