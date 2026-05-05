const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student',
  },
  organizationalCode: {
    type: String,
    unique: true,
  },
  phoneNumber: String,
  profileImage: String,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  identityCard: {
    frontImage: String,
    backImage: String,
    idNumber: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
  resetOtp: String,
  resetOtpExpiry: Date,
}, {
  timestamps: true,
});

// Generate organizational code before saving
userSchema.pre('save', async function(next) {
  if (this.isNew && !this.organizationalCode) {
    this.organizationalCode = 'SDK' + Date.now().toString().slice(-8);
  }
  
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hide password in JSON responses
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
