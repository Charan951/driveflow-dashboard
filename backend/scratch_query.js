import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Booking from './models/Booking.js';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const booking = await Booking.findOne({ orderNumber: 'INV2026062609' });
  if (booking) {
    console.log(JSON.stringify(booking, null, 2));
  } else {
    console.log('Booking not found');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
