const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.post('/send', authorize('admin'), sendNotification);

module.exports = router;
