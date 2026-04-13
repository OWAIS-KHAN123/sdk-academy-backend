const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadIdCard,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);
router.post(
  '/upload-id',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  uploadIdCard
);

module.exports = router;
