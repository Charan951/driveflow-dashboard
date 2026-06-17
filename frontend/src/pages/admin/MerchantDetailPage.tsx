import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, User } from '@/services/userService';
import { bookingService, Booking } from '@/services/bookingService';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock,
  Package,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminMerchantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async (merchantId: string) => {
      try {
        const [userData, bookingsData] = await Promise.all([
          userService.getUserById(merchantId),
          bookingService.getMerchantBookings(merchantId)
        ]);
        setMerchant(userData);
        setBookings(bookingsData);
      } catch (error) {
        toast.error('Failed to load merchant details');
        navigate('/admin/merchants');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData(id);
    }
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!merchant) return null;

  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.billing?.total || booking.finalAmount || (booking.totalAmount + (booking.gstAmount || 0)) || 0), 0);
  const activeOrders = bookings.filter(b => [
    'CREATED', 
    'ASSIGNED', 
    'ACCEPTED', 
    'REACHED_CUSTOMER', 
    'VEHICLE_PICKED', 
    'REACHED_MERCHANT', 
    'SERVICE_STARTED',
    'SERVICE_COMPLETED',
    'OUT_FOR_DELIVERY'
  ].includes(b.status)).length;

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-7xl mx-auto overflow-x-hidden pb-6">
      <button
        onClick={() => navigate('/admin/merchants')}
        className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors shrink-0"
      >
        <ArrowLeft className="w-4 h-4 mr-2 shrink-0" />
        Back to Merchants
      </button>

      {/* Header Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl sm:text-2xl font-bold shrink-0">
                {merchant.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white break-words mb-2">
                  {merchant.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {Array.isArray(merchant.category) ? merchant.category.map((cat, idx) => (
                    <span key={idx} className="inline-flex shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 uppercase">
                      {cat}
                    </span>
                  )) : merchant.category && (
                    <span className="inline-flex shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 uppercase">
                      {merchant.category}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {merchant.isApproved ? (
                    <span className="inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1 shrink-0" />
                      Active
                    </span>
                  ) : merchant.rejectionReason ? (
                    <span className="inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      <XCircle className="w-3 h-3 mr-1 shrink-0" />
                      Rejected
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <Clock className="w-3 h-3 mr-1 shrink-0" />
                      Pending
                    </span>
                  )}
                  {merchant.isShopOpen !== false ? (
                    <span className="inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
                      Shop Open
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 shrink-0" />
                      Shop Closed
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400 min-w-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="min-w-0 break-all">{merchant.email}</span>
                  </div>
                  <div className="flex items-start gap-2 min-w-0">
                    <Phone className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="min-w-0 break-all">{merchant.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-start gap-2 min-w-0">
                    <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="min-w-0">Joined {new Date(merchant.createdAt || '').toLocaleDateString()}</span>
                  </div>
                  {merchant.location && (
                    <div className="flex items-start gap-2 col-span-1 md:col-span-2 min-w-0">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words">
                        {merchant.location.address || `${merchant.location.lat}, ${merchant.location.lng}`}
                        {merchant.location.lat && merchant.location.lng && (
                          <a 
                            href={`https://www.google.com/maps?q=${merchant.location.lat},${merchant.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline text-xs ml-1 inline-block"
                          >
                            (View on Map)
                          </a>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <button
                onClick={() => navigate('/admin/tracking', { state: { selectedAsset: merchant } })}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <MapPin className="w-4 h-4 shrink-0" />
                Live Tracking
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-w-0"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹{totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-w-0"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Orders</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activeOrders}</h3>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="w-full">
        {/* Recent Orders Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-w-0 max-w-full">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-sm text-left min-w-[640px] sm:min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  bookings.slice(0, 5).map((booking) => (
                    <tr 
                      key={booking._id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white truncate max-w-[100px]">
                        #{booking.orderNumber ?? booking._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(booking.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize">{booking.status}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">₹{booking.billing?.total || booking.finalAmount || (booking.totalAmount + (booking.gstAmount || 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMerchantDetailPage;
