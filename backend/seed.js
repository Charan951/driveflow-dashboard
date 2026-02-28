import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from './models/Service.js';
import User from './models/User.js';

dotenv.config();

const services = [
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
