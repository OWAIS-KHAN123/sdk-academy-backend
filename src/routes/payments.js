const express = require('express');
const {
  submitPurchaseRequest,
  getPaymentHistory,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  validateReceipt,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/request', upload.single('screenshot'), submitPurchaseRequest);
router.get('/history', getPaymentHistory);
router.get('/pending', authorize('admin'), getPendingPayments);
router.put('/:id/approve', authorize('admin'), approvePayment);
router.put('/:id/reject', authorize('admin'), rejectPayment);
router.post('/validate-receipt', authorize('admin'), validateReceipt);

module.exports = router;
