const User = require('../models/User');
const { uploadToR2 } = require('../config/cloudflare');

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
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

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      address: req.body.address,
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile picture
// @route   POST /api/v1/users/upload-avatar
// @access  Private
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    const { url: imageUrl } = await uploadToR2(req.file, 'avatars', 'image');

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: imageUrl },
      { new: true }
    );

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload identity card
// @route   POST /api/v1/users/upload-id
// @access  Private
exports.uploadIdCard = async (req, res, next) => {
  try {
    if (!req.files || !req.files.front || !req.files.back) {
      return res.status(400).json({
        success: false,
        message: 'Please upload both front and back images',
      });
    }

    const { url: frontUrl } = await uploadToR2(req.files.front[0], 'identity-cards', 'image');
    const { url: backUrl } = await uploadToR2(req.files.back[0], 'identity-cards', 'image');

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        'identityCard.frontImage': frontUrl,
        'identityCard.backImage': backUrl,
        'identityCard.idNumber': req.body.idNumber,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};
