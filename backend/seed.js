import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from './models/Service.js';
import User from './models/User.js';

dotenv.config();

const services = [
  // --- Two Wheelers (Bike) ---
  {
    name: 'Periodic Service',
    description: 'Comprehensive periodic maintenance for your two-wheeler.',
    price: 80,
    duration: 60,
    category: 'Periodic',
    features: ['Oil Change', 'Filter Clean', 'Brake Adjustment', 'Chain Lube'],
    vehicleType: 'Bike',
  },
  {
    name: 'Engine Repair',
    description: 'Expert engine diagnostics and repair services.',
    price: 150,
    duration: 120,
    category: 'Repair',
    features: ['Engine Tuning', 'Clutch Repair', 'Gearbox Check'],
    vehicleType: 'Bike',
  },
  {
    name: 'Minor/Major Repairs',
    description: 'Fixing all minor and major mechanical issues.',
    price: 100,
    duration: 90,
    category: 'Repair',
    features: ['Cable Replacement', 'Spark Plug Change', 'General Fixes'],
    vehicleType: 'Bike',
  },
  {
    name: 'Teflon Coating',
    description: 'Protective coating for long-lasting shine and paint protection.',
    price: 40,
    duration: 45,
    category: 'Detailing',
    features: ['Scratch Resistance', 'Glossy Finish', 'Paint Protection'],
    vehicleType: 'Bike',
  },
  {
    name: 'Silencer Coating',
    description: 'Anti-rust coating for your bike silencer.',
    price: 30,
    duration: 30,
    category: 'Detailing',
    features: ['Rust Protection', 'Heat Resistance', 'Extended Life'],
    vehicleType: 'Bike',
  },
  {
    name: 'Denting & Painting',
    description: 'Remove dents and restore your bike’s paint.',
    price: 120,
    duration: 180,
    category: 'Painting',
    features: ['Dent Removal', 'Color Matching', 'High Quality Paint'],
    vehicleType: 'Bike',
  },
  {
    name: 'Accessories',
    description: 'Installation of premium bike accessories.',
    price: 20,
    duration: 30,
    category: 'Other',
    features: ['Seat Covers', 'Grips', 'Lights Installation'],
    vehicleType: 'Bike',
  },
  {
    name: 'Wash & Polish',
    description: 'Thorough washing and polishing for a brand new look.',
    price: 15,
    duration: 30,
    category: 'Wash',
    features: ['Foam Wash', 'Polishing', 'Degreasing'],
    vehicleType: 'Bike',
  },

  // --- Cars (Car) ---
  {
    name: 'Periodic Maintenance',
    description: 'Complete checkup and maintenance for your car.',
    price: 150,
    duration: 120,
    category: 'Periodic',
    features: ['Oil Change', 'Filter Replacement', 'Brake Check', 'Fluid Top-up'],
    vehicleType: 'Car',
  },
  {
    name: 'Car Wash',
    description: 'Exterior wash and interior vacuuming.',
    price: 25,
    duration: 30,
    category: 'Wash',
    features: ['Foam Wash', 'Vacuum', 'Tyre Polish'],
    vehicleType: 'Car',
  },
  {
    name: 'Denting & Painting',
    description: 'Professional dent repair and full body painting.',
    price: 300,
    duration: 240,
    category: 'Painting',
    features: ['Scratch Removal', 'Panel Beating', 'Premium Paint'],
    vehicleType: 'Car',
  },
  {
    name: 'Car Detailing',
    description: 'Deep cleaning and detailing for interior and exterior.',
    price: 100,
    duration: 150,
    category: 'Detailing',
    features: ['Interior Deep Clean', 'Exterior Waxing', 'Engine Bay Clean'],
    vehicleType: 'Car',
  },
  {
    name: 'Air Conditioning',
    description: 'AC servicing, gas refilling, and repair.',
    price: 80,
    duration: 60,
    category: 'AC',
    features: ['Gas Refill', 'Filter Clean', 'Cooling Check'],
    vehicleType: 'Car',
  },
  {
    name: 'Car Body Shop',
    description: 'Comprehensive body repairs and structural fixes.',
    price: 400,
    duration: 300,
    category: 'Repair',
    features: ['Collision Repair', 'Chassis Alignment', 'Parts Replacement'],
    vehicleType: 'Car',
  },
];

const users = [
  {
    name: 'Admin User',
    email: 'admin@gmail.com',
    password: 'admin@123',
    role: 'admin',
    isApproved: true,
    phone: '1234567890'
  },
  {
    name: 'Demo Merchant',
    email: 'merchant@driveflow.com',
    password: 'merchantpassword123',
    role: 'merchant',
    isApproved: true,
    phone: '0987654321'
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    await Service.deleteMany();
    await User.deleteMany(); 
    console.log('Data cleared');

    await Service.insertMany(services);
    
    for (const user of users) {
        await User.create(user);
    }

    console.log('Data seeded');

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
