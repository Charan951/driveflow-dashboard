import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const users = [
  {
    name: 'Admin User',
    email: 'info@carzzi.com',
    password: 'admin@123',
    role: 'admin',
    isApproved: true,
    phone: '1234567890'
  },
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    await User.deleteMany();
    console.log('Cleared existing users.');

    for (const user of users) {
      await User.create(user);
    }
    console.log('Seeded admin credentials successfully.');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
