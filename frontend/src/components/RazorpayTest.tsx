import React from 'react';
import { toast } from 'sonner';

const RazorpayTest: React.FC = () => {
  const testRazorpay = () => {
    if (!window.Razorpay) {
      toast.error('Razorpay not loaded');
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: 100, // 1 rupee in paise
      currency: 'INR',
      name: 'DriveFlow Test',
      description: 'Test Payment',
      handler: (response: any) => {
        toast.success('Test payment successful!');
      },
      prefill: {
        name: 'Test User',
        email: 'test@example.com',
        contact: '9999999999'
      },
      theme: {
        color: '#3B82F6'
      },
      modal: {
        ondismiss: () => {
          toast.info('Test payment cancelled');
        }
      }
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={testRazorpay}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
      >
        Test Razorpay
      </button>
    </div>
  );
};

export default RazorpayTest;