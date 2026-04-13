require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/database');

const testLogin = async () => {
  try {
    await connectDB();
    const email = 'student@test.com';
    const password = 'student123';

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:', user.email);
    console.log('Encrypted Password in DB:', user.password);

    const isMatch = await user.comparePassword(password);
    if (isMatch) {
      console.log('✅ Password matches!');
    } else {
      console.log('❌ Password does NOT match');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testLogin();
