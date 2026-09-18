import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

// Non-destructive: only touches the phone field on this one admin account.
// Admin login now requires a WhatsApp/SMS OTP after email+password (see
// the `user.role === 'admin'` branch in prepareLogin,
// backend/controllers/authController.js) — the OTP is sent to whatever
// number is on the account, so it has to be a real, reachable number.
const ADMIN_EMAIL = 'info@carzzi.com';
const ADMIN_PHONE = '9849964945';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    const user = await User.findOne({ email: ADMIN_EMAIL });
    if (!user) {
      console.error(`No user found with email ${ADMIN_EMAIL} — nothing to update.`);
      process.exit(1);
    }
    if (user.role !== 'admin') {
      console.error(`User ${ADMIN_EMAIL} has role "${user.role}", not "admin" — refusing to touch it.`);
      process.exit(1);
    }

    user.phone = ADMIN_PHONE;
    await user.save();
    console.log(`Updated ${ADMIN_EMAIL} (admin) phone -> ${ADMIN_PHONE}`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

run();
