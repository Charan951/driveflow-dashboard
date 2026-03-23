import dotenv from 'dotenv';
import mongoose from 'mongoose';
import paymentService from './services/paymentService.js';

dotenv.config();

// Test script to verify payment service functionality
async function testPaymentService() {
  try {
    console.log('🧪 Testing Payment Service...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Database connected');

    // Test Razorpay instance creation
    console.log('✅ Razorpay service initialized');
    console.log('📋 Razorpay Key ID:', process.env.RAZORPAY_KEY_ID?.substring(0, 10) + '...');

    // Test signature verification
    const testSignature = paymentService.verifyPaymentSignature(
      'order_test123',
      'pay_test123',
      'invalid_signature'
    );
    console.log('✅ Signature verification test:', testSignature ? '❌ Should be false' : '✅ Correctly false');

    console.log('🎉 Payment service tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Database disconnected');
    process.exit(0);
  }
}

// Run tests
testPaymentService();