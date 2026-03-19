#!/usr/bin/env node

/**
 * Migration script to approve existing customers and admins
 * Only staff and merchants require approval
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

// Load environment variables
dotenv.config();

const migrateUserApproval = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Approve all customers and admins (they don't need approval)
    const result = await User.updateMany(
      { 
        role: { $in: ['customer', 'admin'] },
        isApproved: false 
      },
      { 
        $set: { isApproved: true } 
      }
    );

    console.log(`✅ Approved ${result.modifiedCount} customers and admins`);

    // Show current approval status
    const approvalStats = await User.aggregate([
      {
        $group: {
          _id: { role: '$role', isApproved: '$isApproved' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.role': 1, '_id.isApproved': 1 }
      }
    ]);

    console.log('\n📊 Current approval status:');
    approvalStats.forEach(stat => {
      const status = stat._id.isApproved ? '✅ Approved' : '⏳ Pending';
      console.log(`${stat._id.role}: ${stat.count} users ${status}`);
    });

    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateUserApproval();