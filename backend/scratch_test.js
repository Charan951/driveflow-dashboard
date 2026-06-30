import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Service from './models/Service.js';
import Vehicle from './models/Vehicle.js';
import Booking from './models/Booking.js';
import SlotBlock from './models/SlotBlock.js';

// Recreate backend helpers
const BLOCKING_STATUSES = {
  $nin: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
};

const formatTo12HourSlot = (date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return formatter.format(date).replace(/[\u202f\u00a0]/g, ' ');
};

const getDayBounds = (dateInput) => {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const [y, m, d] = dateInput.split('T')[0].split('-').map(Number);
    const start = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00.000+05:30`);
    const end = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T23:59:59.999+05:30`);
    return { start, end };
  }

  const dObj = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(dObj.getTime())) {
    return { 
      start: new Date(1970, 0, 1), 
      end: new Date(1970, 0, 1) 
    };
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(dObj);
  const mm = parts.find(p => p.type === 'month').value;
  const dd = parts.find(p => p.type === 'day').value;
  const yyyy = parts.find(p => p.type === 'year').value;
  
  const start = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000+05:30`);
  const end = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999+05:30`);
  return { start, end };
};

const normalizeCategoryGroup = (category) => {
  const cat = (category || 'All').trim();
  if (cat === 'All') return 'All';
  if (cat === 'Car Wash' || cat === 'Wash') {
    return 'Car Wash';
  }
  if (cat === 'Tyres & Battery' || cat === 'Tyre & Battery' || cat === 'Tyres' || cat === 'Battery') {
    return 'Tyres & Battery';
  }
  if (cat === 'Essentials') {
    return 'Essentials';
  }
  return 'General Services';
};

const getBlockedSlotsForDate = async (dateInput, category = 'All') => {
  const { start, end } = getDayBounds(dateInput);
  const normalizedCategory = normalizeCategoryGroup(category);
  
  const query = {
    date: { $gte: start, $lte: end },
    $or: [
      { category: 'All' },
      { category: normalizedCategory }
    ]
  };

  const blocks = await SlotBlock.find(query).select('slot');
  return new Set(blocks.map((b) => b.slot.trim()));
};

const isSlotAvailable = async (date, categories = ['All']) => {
  const slotStart = new Date(date);
  const slotLabel = formatTo12HourSlot(slotStart).trim();
  const categoriesToCheck = Array.isArray(categories) ? categories : [categories];
  const { start, end } = getDayBounds(date);

  console.log(`isSlotAvailable params: date=${date}, slotLabel="${slotLabel}", categoriesToCheck=${JSON.stringify(categoriesToCheck)}`);
  console.log(`getDayBounds start=${start.toISOString()}, end=${end.toISOString()}`);

  // Check for admin blocks
  for (const category of categoriesToCheck) {
    const blockedSlots = await getBlockedSlotsForDate(start, category);
    console.log(`Category "${category}": blockedSlots =`, Array.from(blockedSlots));
    if (blockedSlots.has(slotLabel)) {
      console.log(`-> BLOCKED (admin block)`);
      return false;
    }
  }

  // Check for conflicting bookings
  const bookings = await Booking.find({
    status: BLOCKING_STATUSES,
    date: { $gte: start, $lte: end },
  }).populate('services', 'category');

  console.log(`Found ${bookings.length} overlapping bookings on the same day.`);

  return true;
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const dateToCheck = '2026-06-26T12:00:00.000Z'; // 5:30 PM IST
  const categories = ['Car Wash'];
  const res = await isSlotAvailable(dateToCheck, categories);
  console.log(`RESULT: isSlotAvailable = ${res}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
