import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Car, 
  Wrench, 
  CreditCard, 
  FileText,
  ArrowLeft,
  MoreVertical,
  CheckCircle,
  XCircle,
  X,
  Save
} from 'lucide-react';
import { userService, User } from '@/services/userService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService, Booking } from '@/services/bookingService';
import { serviceService, Service } from '@/services/serviceService';
import { toast } from 'sonner';
import VehicleCard from '@/components/VehicleCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isValidEmail, isValidPhone10 } from '@/lib/formValidation';

const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        
        const [userData, vehiclesData, bookingsData] = await Promise.all([
          userService.getUserById(id),
          vehicleService.getUserVehicles(id),
          bookingService.getUserBookings(id)
        ]);

        setUser(userData);
        setEditFormData({
          name: userData.name,
          email: userData.email,
          phone: userData.phone || ''
        });
        setVehicles(vehiclesData);
        setBookings(bookingsData);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load user details');
        navigate('/admin/customers');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, navigate]);

  const handleSaveProfile = async () => {
    if (!editFormData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!isValidEmail(editFormData.email)) {
      toast.error('Please enter a valid email');
      return;
    }
    if (editFormData.phone && !isValidPhone10(editFormData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      if (!id) return;
      const updatedUser = await userService.updateUser(id, {
        name: editFormData.name.trim(),
        email: editFormData.email,
        phone: editFormData.phone
      });
      setUser(updatedUser);
      setIsEditModalOpen(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    }
  };

  if (isLoading || !user) {
    return <div className="p-8 text-center">Loading user details...</div>;
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      merchant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      staff: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      user: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${colors[role as keyof typeof colors] || colors.user}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/customers')}
          className="p-2 hover:bg-muted rounded-full transition-colors border border-border"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">User Profile</h1>
          <p className="text-muted-foreground text-sm">Manage user details, vehicles, and bookings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - User Info */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border overflow-hidden p-6 text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-1">{user.name}</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              {getRoleBadge(user.role)}
              {user.isApproved ? (
                 <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                   <CheckCircle className="w-3 h-3" /> Approved
                 </span>
              ) : user.rejectionReason ? (
                <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  <XCircle className="w-3 h-3" /> Rejected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                  Pending
                </span>
              )}
            </div>

            <div className="space-y-4 text-left mt-6">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{user.phone || 'No phone number'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="capitalize">ID: {user._id}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border flex gap-2">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors border border-primary"
              >
                Edit Profile
              </button>
              <button 
                onClick={() => toast.info('More options feature coming soon')}
                className="p-2 border border-border rounded-xl hover:bg-muted transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
              <p className="text-2xl font-bold">{vehicles.length}</p>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-sm text-muted-foreground mb-1">Total Bookings</p>
              <p className="text-2xl font-bold">{bookings.length}</p>
            </div>
          </div>
        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto rounded-none mb-6">
              <TabsTrigger 
                value="vehicles"
                className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Vehicles
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="bookings"
                className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Bookings
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="payments"
                className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payments
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="documents"
                className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vehicles" className="space-y-4">
              {vehicles.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No vehicles registered</h3>
                  <p className="text-muted-foreground">This user hasn't added any vehicles yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vehicles.map(vehicle => (
                    <VehicleCard 
                      key={vehicle._id} 
                      id={vehicle._id}
                      {...vehicle} 
                      onClick={() => navigate(`/admin/vehicles/${vehicle._id}`)} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No booking history</h3>
                  <p className="text-muted-foreground">This user hasn't made any bookings yet.</p>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[800px]">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="p-4 font-medium">Service</th>
                          <th className="p-4 font-medium">Date</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map(booking => (
                          <tr 
                            key={booking._id} 
                            className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                          >
                            <td className="p-4">
                              <div className="font-medium">
                                  {Array.isArray(booking.services) 
                                  ? (booking.services as Service[]).map(s => s.name).join(', ') 
                                  : 'Service'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                  {(booking.vehicle as unknown as Vehicle)?.make} {(booking.vehicle as unknown as Vehicle)?.model}
                              </div>
                            </td>
                            <td className="p-4">
                              {new Date(booking.date).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium 
                                  ${booking.status === 'DELIVERED' || booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                    'bg-blue-100 text-blue-800'}`}
                                >
                                {booking.status}
                              </span>
                            </td>
                            <td className="p-4 text-right font-medium">
                              ₹{booking.totalAmount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments">
              <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium">No payments found</h3>
                <p className="text-muted-foreground">Payment history will appear here.</p>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium">No documents found</h3>
                <p className="text-muted-foreground">User documents like licenses and insurance will appear here.</p>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-semibold">Edit Profile</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-muted rounded-full border border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Enter 10-digit phone number"
                    maxLength={10}
                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              
              <div className="p-6 bg-muted/30 border-t border-border flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-background border border-border hover:bg-muted rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border border-primary"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUserDetailPage;
