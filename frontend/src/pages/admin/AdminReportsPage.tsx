import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, Users, Car, Calendar, DollarSign } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { reportService } from '../../services/reportService';
import { toast } from 'react-hot-toast';

interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  totalCustomers: number;
  totalVehicles: number;
}

interface RevenueData {
  _id: string;
  amount: number;
}

interface TopService {
  _id: string;
  count: number;
}

interface MerchantPerformance {
  _id: string;
  name: string;
  email: string;
  totalBookings: number;
  totalRevenue: number;
}

const AdminReportsPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [merchants, setMerchants] = useState<MerchantPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, revenue, services, merchantPerf] = await Promise.all([
        reportService.getDashboardStats(),
        reportService.getRevenueAnalytics(),
        reportService.getTopServices(),
        reportService.getMerchantPerformance(),
      ]);

      setStats(statsData);
      setRevenueData(revenue);
      setTopServices(services);
      setMerchants(merchantPerf);
    } catch (error) {
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    // Mock download for now - in real app, call backend to generate PDF/CSV
    toast.success('Report download started...');
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600">Overview of system performance and metrics</p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
          { title: 'Total Bookings', value: stats?.totalBookings || 0, icon: Calendar, color: 'bg-blue-100 text-blue-600' },
          { title: 'Active Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'bg-purple-100 text-purple-600' },
          { title: 'Fleet Size', value: stats?.totalVehicles || 0, icon: Car, color: 'bg-amber-100 text-amber-600' },
        ].map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Trend (Last 7 Days)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Services Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Services by Volume</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topServices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="_id" type="category" width={120} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Merchant Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Top Performing Merchants</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Merchant Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium text-right">Total Bookings</th>
                <th className="px-6 py-3 font-medium text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {merchants.map((merchant) => (
                <tr key={merchant._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{merchant.name}</td>
                  <td className="px-6 py-4 text-gray-600">{merchant.email}</td>
                  <td className="px-6 py-4 text-right text-gray-800">{merchant.totalBookings}</td>
                  <td className="px-6 py-4 text-right font-medium text-green-600">
                    ₹{merchant.totalRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
              {merchants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    No merchant data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminReportsPage;
