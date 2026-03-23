import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, DollarSign, AlertCircle, CheckCircle, FileText, RefreshCw } from 'lucide-react';
import { paymentService, PaymentData } from '../../services/paymentService';
import { toast } from 'react-hot-toast';
import PaymentHistory from '../../components/PaymentHistory';

const AdminPaymentsPage = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Monitor and manage all payment transactions</p>
        </div>
      </div>

      {/* Payment History Component */}
      <PaymentHistory isAdmin={true} />
    </div>
  );
};
export default AdminPaymentsPage;