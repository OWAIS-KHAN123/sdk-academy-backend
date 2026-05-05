const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/emailService');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phoneNumber,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    let { email, password } = req.body;
    email = email?.trim();
    password = password?.trim();

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    console.log(`Login attempt for: ${email}`);
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('User not found in DB');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    console.log(`Password match: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login (use findByIdAndUpdate to avoid triggering hooks)
    await User.findByIdAndUpdate(user._id, { lastLogin: Date.now() });

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password — generate OTP and email it
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log('[forgotPassword] received request for:', email);
    console.log('[forgotPassword] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);

    const user = await User.findOne({ email: email?.trim().toLowerCase() });
    if (!user) {
      console.log('[forgotPassword] user NOT found:', email);
      return res.status(404).json({ success: false, message: 'No user found with this email' });
    }
    console.log('[forgotPassword] user found, generating OTP');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save({ validateBeforeSave: false });
    console.log('[forgotPassword] OTP saved to user, calling sendOtpEmail');

    try {
      const result = await sendOtpEmail(user.email, otp);
      console.log('[forgotPassword] sendOtpEmail success, result:', JSON.stringify(result));
    } catch (emailErr) {
      console.error('[forgotPassword] sendOtpEmail FAILED:', emailErr?.message || emailErr);
      console.error('[forgotPassword] full error:', emailErr);
      user.resetOtp = undefined;
      user.resetOtpExpiry = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    res.status(200).json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('[forgotPassword] outer error:', error?.message || error);
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email?.trim().toLowerCase(),
      resetOtp: otp?.trim(),
      resetOtpExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email: email?.trim().toLowerCase(),
      resetOtp: otp?.trim(),
      resetOtpExpiry: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};
