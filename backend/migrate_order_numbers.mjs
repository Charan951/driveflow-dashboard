import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from './models/Booking.js';
import Counter from './models/Counter.js';

dotenv.config();

async function ensureCounterBase() {
  const last = await Booking.find({ orderNumber: { $exists: true } })
    .sort({ orderNumber: -1 })
    .limit(1)
    .select('orderNumber')
    .lean();
  const lastAssigned = last.length ? last[0].orderNumber : null;
  const doc = await Counter.findOne({ name: 'booking' });
  if (!doc) {
    await Counter.create({ name: 'booking', seq: typeof lastAssigned === 'number' ? lastAssigned : 999 });
    return;
  }
  if (typeof lastAssigned === 'number' && (doc.seq ?? 0) < lastAssigned) {
    doc.seq = lastAssigned;
    await doc.save();
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await ensureCounterBase();
  const toAssign = await Booking.find({ orderNumber: { $exists: false } })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean();
  let assigned = 0;
  for (const b of toAssign) {
    const next = await Counter.next('booking');
    await Booking.updateOne({ _id: b._id }, { $set: { orderNumber: next } });
    assigned++;
  }
  await mongoose.disconnect();
  console.log(`Assigned order numbers to ${assigned} bookings`);
}

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
