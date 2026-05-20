import dotenv from 'dotenv';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import crypto from 'crypto';

dotenv.config();

console.log('=== Cashfree Configuration Test ===\n');

// Check environment variables
console.log('1. Checking environment variables...');
const requiredVars = ['CASHFREE_ENV', 'CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY'];
let allVarsPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`   ❌ ${varName}: NOT SET`);
    allVarsPresent = false;
  } else {
    console.log(`   ✓ ${varName}: ${varName.includes('SECRET') ? '***' : value}`);
  }
});

if (!allVarsPresent) {
  console.log('\n❌ Missing required environment variables!');
  process.exit(1);
}

console.log('\n2. Initializing Cashfree client...');
try {
  const env = process.env.CASHFREE_ENV === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  const cashfree = new Cashfree(env, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);
  console.log('   ✓ Cashfree client initialized');
  console.log(`   Environment: ${process.env.CASHFREE_ENV}`);

  console.log('\n3. Testing order creation...');
  const orderId = `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  const request = {
    order_id: orderId,
    order_amount: 1,
    order_currency: 'INR',
    customer_details: {
      customer_id: 'test_user_123',
      customer_email: 'test@example.com',
      customer_phone: '9999999999'
    },
    order_meta: {
      return_url: 'http://localhost:8080/payment/callback?order_id={order_id}'
    },
    order_expiry_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    order_note: 'Test order'
  };

  console.log('   Order ID:', orderId);
  console.log('   Amount: ₹1');
  
  const cfRes = await cashfree.PGCreateOrder(request);
  console.log('\n   ✓ Order created successfully!');
  console.log('   CF Order ID:', cfRes.data.cf_order_id);
  console.log('   Payment Session ID:', cfRes.data.payment_session_id ? '***' : 'Not present');
  
  console.log('\n✅ All tests passed! Cashfree is configured correctly.');
  console.log('\nNote: If you got the "product not activated" error, you need to:');
  console.log('   1. Log in to Cashfree dashboard (https://merchant.cashfree.com/)');
  console.log('   2. Go to Payment Gateway > Products');
  console.log('   3. Ensure the payment gateway product is activated');
  console.log('   4. Verify you are using sandbox credentials for testing');
  
} catch (error) {
  console.log('\n❌ Error:', error.message);
  if (error.response?.data) {
    console.log('\nCashfree API Response:');
    console.log(JSON.stringify(error.response.data, null, 2));
  }
  
  console.log('\n=== Troubleshooting Guide ===');
  if (error.message?.includes('product is not activated')) {
    console.log('\n💡 This means your Cashfree account doesn\'t have the payment gateway product activated.');
    console.log('   Steps to fix:');
    console.log('   1. Log in to https://merchant.cashfree.com/');
    console.log('   2. Navigate to Payment Gateway > Products');
    console.log('   3. Activate the payment gateway product for your account');
    console.log('   4. Make sure you\'re in the correct environment (sandbox/test mode)');
  } else if (error.message?.includes('authentication')) {
    console.log('\n💡 Invalid credentials! Check your CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env');
  } else {
    console.log('\n💡 Check the error details above and verify your Cashfree account setup.');
  }
}
