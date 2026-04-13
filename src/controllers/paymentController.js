const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const { uploadToS3 } = require('../config/s3');

// @desc    Submit purchase request
// @route   POST /api/v1/payments/request
// @access  Private
exports.submitPurchaseRequest = async (req, res, next) => {
  try {
    const { courseId, receiptNumber } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course',
      });
    }

    // Check if receipt number already used
    const existingPayment = await Payment.findOne({ receiptNumber });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'This receipt number has already been used',
      });
    }

    // Upload screenshot
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload payment screenshot',
      });
    }

    const screenshotUrl = await uploadToS3(req.file, 'payment-screenshots');

    // Create payment record
    const payment = await Payment.create({
      userId: req.user.id,
      courseId,
      amount: course.discountedPrice || course.price,
      receiptNumber,
      screenshotUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Purchase request submitted successfully',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment history
// @route   GET /api/v1/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .populate('courseId', 'title thumbnail')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending payment approvals
// @route   GET /api/v1/payments/pending
// @access  Private/Admin
exports.getPendingPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ status: 'pending' })
      .populate('userId', 'name email')
      .populate('courseId', 'title price')
      .sort('-submittedAt');

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve payment
// @route   PUT /api/v1/payments/:id/approve
// @access  Private/Admin
exports.approvePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment already processed',
      });
    }

    // Update payment status
    payment.status = 'approved';
    payment.reviewedBy = req.user.id;
    payment.reviewedAt = Date.now();
    await payment.save();

    // Create enrollment
    const enrollment = await Enrollment.create({
      userId: payment.userId,
      courseId: payment.courseId,
      receiptNumber: payment.receiptNumber,
      approvedBy: req.user.id,
      approvalDate: Date.now(),
    });

    // Create notification for user
    await Notification.create({
      userId: payment.userId,
      title: 'Purchase Approved',
      message: 'Your course purchase has been approved. You can now access the course.',
      type: 'payment',
      referenceId: payment.courseId,
    });

    res.status(200).json({
      success: true,
      message: 'Payment approved successfully',
      payment,
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject payment
// @route   PUT /api/v1/payments/:id/reject
// @access  Private/Admin
exports.rejectPayment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment already processed',
      });
    }

    payment.status = 'rejected';
    payment.reviewedBy = req.user.id;
    payment.reviewedAt = Date.now();
    payment.rejectionReason = reason;
    await payment.save();

    // Create notification for user
    await Notification.create({
      userId: payment.userId,
      title: 'Purchase Rejected',
      message: `Your course purchase was rejected. Reason: ${reason}`,
      type: 'payment',
      referenceId: payment.courseId,
    });

    res.status(200).json({
      success: true,
      message: 'Payment rejected',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate receipt number
// @route   POST /api/v1/payments/validate-receipt
// @access  Private/Admin
exports.validateReceipt = async (req, res, next) => {
  try {
    const { receiptNumber } = req.body;

    const payment = await Payment.findOne({ receiptNumber });

    if (payment) {
      return res.status(200).json({
        success: false,
        message: 'Receipt number already used',
        isValid: false,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Receipt number is valid',
      isValid: true,
    });
  } catch (error) {
    next(error);
  }
};
