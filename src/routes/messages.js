const express = require('express');
const {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getAdmins,
  approveEnrollment,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/conversations', getConversations);
router.get('/admins', getAdmins);
router.post('/approve', approveEnrollment);
router.get('/:conversationId', getMessages);
router.post('/', upload.single('attachment'), sendMessage);
router.put('/:id/read', markAsRead);

module.exports = router;
