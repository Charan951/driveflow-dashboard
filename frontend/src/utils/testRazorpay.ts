/*
// Test utility to verify Razorpay integration
export const testRazorpayIntegration = () => {
  console.log('🧪 Testing Razorpay Integration...');
  
  // Check environment variables
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
  const apiUrl = import.meta.env.VITE_API_URL;
  
  console.log('📋 Environment Check:');
  console.log('- Razorpay Key ID:', razorpayKeyId ? '✅ Set' : '❌ Missing');
  console.log('- API URL:', apiUrl ? '✅ Set' : '❌ Missing');
  
  // Check if Razorpay script is loaded
  const razorpayLoaded = typeof (window as any).Razorpay !== 'undefined';
  console.log('- Razorpay Script:', razorpayLoaded ? '✅ Loaded' : '❌ Not loaded');
  
  // Test payment service import
  try {
    import('../services/paymentService').then(() => {
      console.log('- Payment Service: ✅ Imported successfully');
    });
  } catch (error) {
    console.log('- Payment Service: ❌ Import failed');
  }
  
  console.log('🎉 Razorpay integration test completed!');
};

// Auto-run in development
if (import.meta.env.DEV) {
  // Run test after a short delay to ensure everything is loaded
  setTimeout(testRazorpayIntegration, 1000);
}
*/