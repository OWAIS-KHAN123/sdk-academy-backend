const express = require('express');
const {
  getDashboard,
  getUsers,
  suspendUser,
  unsuspendUser,
  manualEnroll,
  getCloudflareStorage,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/unsuspend', unsuspendUser);
router.post('/users/:id/enroll', manualEnroll);
router.get('/cloudflare/storage', getCloudflareStorage);

module.exports = router;
