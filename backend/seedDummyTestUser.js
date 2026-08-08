import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

// Non-destructive: only inserts/updates this one QA test account, unlike seed.js
// (which wipes the whole users collection). Matches the dummy credentials wired
// into the phone-OTP bypass in backend/controllers/authController.js.
const DUMMY_USER = {
  name: 'Test User',
  email: 'verification@gmail.com',
  password: 'Admin@123',
  role: 'customer',
  isApproved: true,
  phone: '1111111111',
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    let user = await User.findOne({ email: DUMMY_USER.email });
    if (user) {
      user.password = DUMMY_USER.password;
      user.role = DUMMY_USER.role;
      user.isApproved = DUMMY_USER.isApproved;
      user.phone = DUMMY_USER.phone;
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
      console.log('Updated existing dummy test user:', DUMMY_USER.email);
    } else {
      await User.create(DUMMY_USER);
      console.log('Created dummy test user:', DUMMY_USER.email);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

run();
