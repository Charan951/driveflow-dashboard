import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, DollarSign, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { paymentService, PaymentData } from '../../services/paymentService';
import { toast } from 'react-hot-toast';

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await paymentService.getAllPayments();
      setPayments(data);
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filterStatus === 'All' || payment.status === filterStatus.toLowerCase();
    const matchesSearch = 
      payment.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    totalRevenue: payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
    platformEarnings: payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.platformFee || 0), 0),
    pendingCount: payments.filter(p => p.status === 'pending').length,
    failedCount: payments.filter(p => p.status === 'failed').length,
  };

  const handleExportCSV = () => {
    const headers = ['Booking ID', 'Customer', 'Date', 'Amount', 'Platform Fee', 'Merchant Earnings', 'Status', 'Payment ID'];
    const csvContent = [
      headers.join(','),
      ...filteredPayments.map(p => [
        p.bookingId,
        p.user?.name || 'Unknown',
        new Date(p.date).toLocaleDateString(),
        p.amount,
        p.platformFee,
        p.merchantEarnings,
        p.status,
        p.paymentId || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleDownloadInvoice = (bookingId: string) => {
    // Assuming the invoice URL pattern, or use a service method if needed
    // Ideally this should use a service to get a blob or redirect
    window.open(`${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}/invoice`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Payments & Finance</h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={20} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                ${stats.totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Platform Earnings</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                ${stats.platformEarnings.toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <DollarSign size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {stats.pendingCount}
              </h3>
            </div>
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
              <AlertCircle size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Failed Payments</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {stats.failedCount}
              </h3>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertCircle size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search booking ID, customer, or payment ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter size={20} className="text-gray-400" />
          <select
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Booking ID</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Platform Fee</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((payment) => (
                <tr key={payment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">
                    #{payment.bookingId.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="font-medium text-gray-800">{payment.user?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{payment.user?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    ${payment.amount}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-600 font-medium">
                    ${payment.platformFee.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium
                      ${payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}`}
                    >
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDownloadInvoice(payment.bookingId)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Download Invoice"
                    >
                      <FileText size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPayments.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No payments found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentsPage;