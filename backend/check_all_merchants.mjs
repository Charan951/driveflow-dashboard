import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const checkAllMerchants = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const merchants = await User.find({ role: 'merchant' });
    console.log(`Found ${merchants.length} merchants:`);
    merchants.forEach(m => {
        console.log(`- ${m.name} (ID: ${m._id}): isShopOpen = ${m.isShopOpen} (${typeof m.isShopOpen})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkAllMerchants();