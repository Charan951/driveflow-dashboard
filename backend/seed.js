import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from './models/Service.js';
import User from './models/User.js';

dotenv.config();

const services = [
  // --- Services ---
  {
    name: 'General Service',
    description: 'Comprehensive car checkup and maintenance.',
    price: 150,
    duration: 120,
    category: 'Periodic',
    features: ['Oil Change', 'Filter Replacement', 'Brake Check', 'Fluid Top-up'],
    vehicleType: 'Car',
  },
  {
    name: 'Body Shop',
    description: 'Expert denting and painting services.',
    price: 300,
    duration: 240,
    category: 'Painting',
    features: ['Scratch Removal', 'Panel Beating', 'Premium Paint'],
    vehicleType: 'Car',
  },
  {
    name: 'Insurance Claim',
    description: 'Hassle-free insurance claim processing and repairs.',
    price: 0,
    duration: 0,
    category: 'Insurance',
    features: ['Cashless Repair', 'Document Support', 'Claim Assistance'],
    vehicleType: 'Car',
  },
  // --- Car Wash ---
  {
    name: 'Exterior only (45 mins)',
    description: 'Professional exterior foam wash and drying.',
    price: 30,
    duration: 45,
    category: 'Wash',
    features: ['Foam Wash', 'Tyre Polish', 'Body Drying'],
    vehicleType: 'Car',
  },
  {
    name: 'Interior + Exterior (60–70 mins)',
    description: 'Complete interior vacuuming and exterior wash.',
    price: 50,
    duration: 70,
    category: 'Wash',
    features: ['Foam Wash', 'Interior Vacuum', 'Dashboard Polish', 'Tyre Polish'],
    vehicleType: 'Car',
  },
  {
    name: 'Interior + Exterior + Underbody (90 mins)',
    description: 'Deep cleaning including underbody wash.',
    price: 80,
    duration: 90,
    category: 'Wash',
    features: ['Foam Wash', 'Underbody Wash', 'Interior Deep Clean', 'Waxing'],
    vehicleType: 'Car',
  },
  // --- Tyres & Battery ---
  {
    name: 'Default OEM size',
    description: 'Standard tyre replacement with OEM recommended size.',
    price: 400,
    duration: 60,
    category: 'Tyres',
    features: ['OEM Specification', 'Wheel Balancing', 'Nitrogen Fill'],
    vehicleType: 'Car',
  },
  {
    name: 'Customer can opt change',
    description: 'Custom tyre size selection based on customer preference.',
    price: 450,
    duration: 90,
    category: 'Tyres',
    features: ['Size Consultation', 'Performance Tyres', 'Expert Fitting'],
    vehicleType: 'Car',
  },
  {
    name: 'Amaron Battery',
    description: 'Reliable Amaron batteries with warranty.',
    price: 120,
    duration: 30,
    category: 'Battery',
    features: ['Long Life', 'Maintenance Free', 'Installation Included'],
    vehicleType: 'Car',
  },
  {
    name: 'Exide Battery',
    description: 'Premium Exide batteries for all car models.',
    price: 130,
    duration: 30,
    category: 'Battery',
    features: ['High Performance', 'Trusted Brand', 'Quick Replacement'],
    vehicleType: 'Car',
  },
  // --- Insurance ---
  {
    name: 'INSURANCE',
    description: 'Car insurance renewal and new policy assistance.',
    price: 0,
    duration: 0,
    category: 'Insurance',
    features: ['Policy Renewal', 'New Policy', 'Premium Comparison'],
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
