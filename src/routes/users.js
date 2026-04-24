const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadIdCard,
  changePassword,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.post('/upload-avatar', upload.single('image'), uploadAvatar);
router.post('/upload-id', upload.single('image'), uploadIdCard);
router.put('/change-password', changePassword);

module.exports = router;
