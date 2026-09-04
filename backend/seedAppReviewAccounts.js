import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

// Non-destructive: only inserts/updates these two accounts, unlike seed.js
// (which wipes the whole users collection). Used as the login credentials
// submitted to App Store Connect / Play Console app review, since
// reviewers can't receive the real WhatsApp/SMS login OTP — these emails
// are wired into the OTP-skip allowlist (APP_REVIEW_EMAILS) in
// backend/controllers/authController.js.
const ACCOUNTS = [
  {
    name: 'App Review Staff',
    email: 'staff.review@carzzi.com',
    password: 'Review@123',
    role: 'staff',
    isApproved: true,
    status: 'Active',
    phone: '9000000001',
  },
  {
    name: 'App Review Merchant',
    email: 'merchant.review@carzzi.com',
    password: 'Review@123',
    role: 'merchant',
    isApproved: true,
    status: 'Active',
    phone: '9000000002',
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    for (const account of ACCOUNTS) {
      let user = await User.findOne({ email: account.email });
      if (user) {
        user.password = account.password;
        user.role = account.role;
        user.isApproved = account.isApproved;
        user.status = account.status;
        user.phone = account.phone;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
        console.log('Updated existing account:', account.email, account.role);
      } else {
        await User.create(account);
        console.log('Created account:', account.email, account.role);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

run();
