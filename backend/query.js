import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Service from './models/Service.js';
import Vehicle from './models/Vehicle.js';
import Booking from './models/Booking.js';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const bookings = await Booking.find({ user: '6a3ba868c3d192f1ca4c1bf0' })
    .populate('services')
    .sort({ createdAt: -1 });

  console.log(`Found ${bookings.length} bookings:`);
  bookings.forEach((b) => {
    console.log(`Booking #${b.orderNumber}:`);
    console.log(`  _id: ${b._id}`);
    console.log(`  status: ${b.status}`);
    console.log(`  paymentStatus: ${b.paymentStatus}`);
    console.log(`  date: ${b.date}`);
    console.log(`  createdAt: ${b.createdAt}`);
    console.log(`  services:`, b.services.map(s => s.name));
    console.log(`  totalAmount: ${b.totalAmount}`);
    console.log(`  finalAmount: ${b.finalAmount}`);
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
