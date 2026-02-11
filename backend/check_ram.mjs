import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const checkRam = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const user = await User.findOne({ name: 'ram' }); // Assuming name is ram based on screenshot
    if (user) {
      console.log('User found:', user.name);
      console.log('isShopOpen:', user.isShopOpen);
      console.log('Role:', user.role);
    } else {
      console.log('User ram not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkRam();