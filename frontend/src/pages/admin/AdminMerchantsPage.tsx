import React, { useEffect, useState } from 'react';
import { userService, User } from '@/services/userService';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Plus, 
  Briefcase, 
  MoreVertical,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Store,
  DollarSign,
  Package,
  Clock,
  Trash2,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LocationPicker from '@/components/LocationPicker';

const AdminMerchantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Merchant Form State
  const [newMerchant, setNewMerchant] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: { address: '', lat: 0, lng: 0 },
  });

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchUsers();

    // Socket Connection for Real-time Status
    socketService.connect();
    socketService.joinRoom('admin');

    socketService.on('userStatusUpdate', (data: { userId: string, isOnline: boolean, lastSeen: string }) => {
      setUsers(prevUsers => prevUsers.map(u => {
        if (u._id === data.userId) {
          return { ...u, isOnline: data.isOnline, lastSeen: data.lastSeen };
        }
        return u;
      }));
    });

    return () => {
      socketService.leaveRoom('admin');
      socketService.off('userStatusUpdate');
      // Don't disconnect here if other components need it, but safe to leave room
    };
  }, []);

  useEffect(() => {
    filterMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchQuery, statusFilter]);

  const fetchUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      // Filter only merchant role
      const merchants = data.filter((u: User) => u.role === 'merchant');
      setUsers(merchants);
    } catch (error) {
      toast.error('Failed to load merchants');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMerchants = () => {
    let result = users;

    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'approved') result = result.filter(u => u.isApproved);
      else if (statusFilter === 'pending') result = result.filter(u => !u.isApproved && !u.rejectionReason);
      else if (statusFilter === 'rejected') result = result.filter(u => !u.isApproved && u.rejectionReason);
    }

    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.phone && u.phone.includes(query))
      );
    }

    setFilteredMerchants(result);
  };

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.addStaff({
        ...newMerchant,
        location: newMerchant.location,
        role: 'merchant' 
      });
      toast.success('Merchant added successfully');
      setShowAddModal(false);
      setNewMerchant({ name: '', email: '', password: '', phone: '', location: { address: '', lat: 0, lng: 0 } });
      fetchUsers();
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to add merchant');
    }
  };

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await userService.approveUser(id);
      setUsers(users.map(u => u._id === id ? { ...u, isApproved: true, rejectionReason: null } : u));
      toast.success('Merchant approved');
    } catch (error) {
      toast.error('Failed to approve merchant');
    }
  };

  const handleRejectClick = (merchant: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMerchant(merchant);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const submitRejection = async () => {
    if (!selectedMerchant) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await userService.rejectUser(selectedMerchant._id, rejectionReason);
      setUsers(users.map(u => u._id === selectedMerchant._id ? { ...u, isApproved: false, rejectionReason } : u));
      toast.success('Merchant rejected');
      setIsRejectModalOpen(false);
    } catch (error) {
      toast.error('Failed to reject merchant');
    }
  };

  const handleDeleteMerchant = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this merchant?')) {
      try {
        await userService.deleteUser(id);
        toast.success('Merchant deleted successfully');
        setUsers(users.filter(u => u._id !== id));
      } catch (error) {
        toast.error('Failed to delete merchant');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Merchant Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage workshop partners and service providers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Merchant
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-5 h-5" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMerchants.map((merchant) => (
            <motion.div
              key={merchant._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/admin/merchants/${merchant._id}`)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer relative group"
            >
              <div className="absolute top-4 right-4 flex items-center gap-2">
                 <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${merchant.isOnline ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${merchant.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {merchant.isOnline ? 'Online' : 'Offline'}
                 </div>

                {merchant.isApproved ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </span>
                ) : merchant.rejectionReason ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="w-3 h-3 mr-1" />
                    Rejected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </span>
                )}
                <button
                  onClick={(e) => handleDeleteMerchant(merchant._id, e)}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{merchant.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {merchant.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                    <DollarSign className="w-3 h-3" />
                    Revenue
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">₹0</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                    <Package className="w-3 h-3" />
                    Stock Items
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">-</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  {merchant.phone || 'N/A'}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                     onClick={(e) => {
                       e.stopPropagation();
                       navigate('/admin/tracking');
                     }}
                     className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                     title="View Live Location"
                  >
                     <MapPin className="w-5 h-5" />
                  </button>

                  {!merchant.isApproved && !merchant.rejectionReason && (
                    <>
                      <button
                        onClick={(e) => handleApprove(merchant._id, e)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => handleRejectClick(merchant, e)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Merchant Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold mb-4 dark:text-white">Add New Merchant</h2>
              <form onSubmit={handleAddMerchant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Merchant/Shop Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newMerchant.name}
                    onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newMerchant.email}
                    onChange={(e) => setNewMerchant({ ...newMerchant, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={newMerchant.phone}
                    onChange={(e) => setNewMerchant({ ...newMerchant, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <LocationPicker
                    value={newMerchant.location}
                    onChange={(value) => setNewMerchant({ ...newMerchant, location: value })}
                    mapClassName="h-[250px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newMerchant.password}
                    onChange={(e) => setNewMerchant({ ...newMerchant, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Merchant
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {isRejectModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl"
            >
              <h2 className="text-xl font-bold mb-4 dark:text-white">Reject Merchant</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Please provide a reason for rejecting <strong>{selectedMerchant?.name}</strong>.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full h-32 px-3 py-2 border rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Reason for rejection..."
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRejection}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject Merchant
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMerchantsPage;