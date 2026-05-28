import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, Users, Car, Calendar, DollarSign, RefreshCw, Zap, ZapOff } from 'lucide-react';
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
import { socketService } from '../../services/socket';
import GlobalSyncRefresh from '@/components/GlobalSyncRefresh';
import { toast } from 'sonner';

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

interface DateRange {
  startDate?: string;
  endDate?: string;
}

const AdminReportsPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [merchants, setMerchants] = useState<MerchantPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [quickDate, setQuickDate] = useState<string>('all');
  
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (params?: DateRange) => {
    try {
      setRefreshing(true);
      const [statsData, revenue, services, merchantPerf] = await Promise.all([
        reportService.getDashboardStats(params),
        reportService.getRevenueAnalytics(params),
        reportService.getTopServices(params),
        reportService.getMerchantPerformance(params),
      ]);

      setStats(statsData);
      setRevenueData(revenue);
      setTopServices(services);
      setMerchants(merchantPerf);
    } catch (error) {
      console.error('Failed to load reports data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleQuickDateSelect = (period: string) => {
    setQuickDate(period);
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      default:
        startDate = undefined;
        endDate = undefined;
    }

    setDateRange({ startDate, endDate });
    fetchData({ startDate, endDate });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    setQuickDate('custom');
  };

  const isValidDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  const applyCustomDateRange = () => {
    if (dateRange.startDate && !isValidDate(dateRange.startDate)) {
      toast.error('Invalid start date');
      return;
    }
    if (dateRange.endDate && !isValidDate(dateRange.endDate)) {
      toast.error('Invalid end date');
      return;
    }
    if (dateRange.startDate && dateRange.endDate && new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }
    fetchData(dateRange);
  };

  const handleDownloadReport = async () => {
    try {
      toast.success('Report download started...');
      const blob = await reportService.exportReport(dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carzzi-reports-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error('Failed to download report');
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  useEffect(() => {
    fetchData();

    socketService.connect();
    socketService.joinRoom('admin');

    const refreshHandler = () => fetchData(dateRange);
    socketService.on('bookingUpdated', refreshHandler);
    socketService.on('bookingCreated', refreshHandler);
    socketService.on('paymentCreated', refreshHandler);

    return () => {
      socketService.leaveRoom('admin');
      socketService.off('bookingUpdated', refreshHandler);
      socketService.off('bookingCreated', refreshHandler);
      socketService.off('paymentCreated', refreshHandler);
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchData(dateRange);
      }, 30000);
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, dateRange, fetchData]);

  if (loading && !stats) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-600 text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <GlobalSyncRefresh
      entities={['booking', 'payment', 'user']}
      onSync={() => fetchData(dateRange)}
    >
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Overview of system performance and metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleAutoRefresh}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? <Zap size={18} className="animate-pulse" /> : <ZapOff size={18} />}
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </button>
          <button
            onClick={() => fetchData(dateRange)}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'Last 7 Days' },
              { key: 'month', label: 'Last 30 Days' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleQuickDateSelect(option.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  quickDate === option.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 lg:ml-auto">
            <span className="text-sm text-gray-500">Custom Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.startDate || ''}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.endDate || ''}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={applyCustomDateRange}
                disabled={!dateRange.startDate || !dateRange.endDate}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: DollarSign, color: 'bg-green-100 text-green-600', change: '+12.5%' },
          { title: 'Total Bookings', value: stats?.totalBookings || 0, icon: Calendar, color: 'bg-blue-100 text-blue-600', change: '+8.2%' },
          { title: 'Active Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'bg-purple-100 text-purple-600', change: '+5.1%' },
          { title: 'Fleet Size', value: stats?.totalVehicles || 0, icon: Car, color: 'bg-amber-100 text-amber-600', change: '+2.3%' },
        ].map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{card.value}</h3>
                {card.change && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp size={12} />
                    {card.change}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Trend</h3>
          <div className="h-80">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="_id" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No revenue data available for selected period
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Services by Volume</h3>
          <div className="h-80">
            {topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis 
                    type="number" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis 
                    dataKey="_id" 
                    type="category" 
                    width={140} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [`${value} bookings`, 'Count']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#4f46e5" 
                    radius={[0, 6, 6, 0]}
                    barSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No service data available for selected period
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Top Performing Merchants</h3>
          <span className="text-sm text-gray-500">{merchants.length} merchants</span>
        </div>
        <div className="overflow-x-auto">
          {merchants.length > 0 ? (
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Merchant Name</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium text-right">Total Bookings</th>
                  <th className="px-6 py-4 font-medium text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {merchants.map((merchant, index) => (
                  <motion.tr
                    key={merchant._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">{merchant.name}</td>
                    <td className="px-6 py-4 text-gray-600">{merchant.email}</td>
                    <td className="px-6 py-4 text-right text-gray-800">{merchant.totalBookings}</td>
                    <td className="px-6 py-4 text-right font-medium text-green-600">
                      ₹{merchant.totalRevenue.toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-16 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No merchant data available for selected period</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
    </GlobalSyncRefresh>
  );
};

export default AdminReportsPage;