import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Car, 
  Wrench, 
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
  const location = useLocation();
  const returnToFromState = (location.state as { returnTo?: string } | null)?.returnTo;
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    returnToFromState === '/admin/staff' ? 'bookings' : 'vehicles'
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const getBackPath = (role?: string) =>
    returnToFromState ??
    (role === 'staff'
      ? '/admin/staff'
      : role === 'merchant'
        ? '/admin/merchants'
        : '/admin/customers');

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
        if (returnToFromState === '/admin/staff' || userData.role === 'staff') {
          setActiveTab('bookings');
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load user details');
        navigate(getBackPath());
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
    if (!isValidEmail(editFormData.email).valid) {
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
      <span className={`inline-flex shrink-0 px-3 py-1 rounded-full text-xs font-medium uppercase ${colors[role as keyof typeof colors] || colors.user}`}>
        {role}
      </span>
    );
  };

  const getProfileContext = () => {
    if (returnToFromState === '/admin/staff' || user?.role === 'staff') return 'staff';
    if (returnToFromState === '/admin/merchants' || user?.role === 'merchant') return 'merchant';
    return 'customer';
  };

  const profileContext = getProfileContext();
  const profileTitle =
    profileContext === 'staff'
      ? 'Staff Profile'
      : profileContext === 'merchant'
        ? 'Merchant Profile'
        : 'Customer Profile';
  const profileSubtitle =
    profileContext === 'staff'
      ? 'Manage staff details, assignments, and activity'
      : profileContext === 'merchant'
        ? 'Manage merchant details, services, and bookings'
        : 'Manage customer details, vehicles, and bookings';

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-7xl mx-auto overflow-x-hidden pb-6">
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-4 min-w-0 max-w-full w-full">
        <button 
          onClick={() => navigate(getBackPath(user?.role))}
          className="p-2 hover:bg-muted rounded-full transition-colors border border-border shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold break-words">{profileTitle}</h1>
          <p className="text-muted-foreground text-sm break-words">{profileSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0 max-w-full">
        {/* Sidebar - User Info */}
        <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full">
          <div className="bg-card rounded-2xl border border-border overflow-hidden p-4 sm:p-6 text-center min-w-0 max-w-full">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-1 break-words">{user.name}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4 max-w-full">
              {getRoleBadge(user.role)}
              {user.isApproved ? (
                 <span className="inline-flex shrink-0 items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                   <CheckCircle className="w-3 h-3 shrink-0" /> Approved
                 </span>
              ) : user.rejectionReason ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  <XCircle className="w-3 h-3 shrink-0" /> Rejected
                 </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                  Pending
                </span>
              )}
            </div>

            <div className="space-y-4 text-left mt-6 min-w-0">
              <div className="flex items-start gap-3 text-sm min-w-0">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="min-w-0 break-all">{user.email}</span>
              </div>
              <div className="flex items-start gap-3 text-sm min-w-0">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="min-w-0 break-all">{user.phone || 'No phone number'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm min-w-0">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="min-w-0 break-all text-xs sm:text-sm">ID: {user._id}</span>
              </div>
            </div>


          </div>

          {/* Quick Stats - hidden for staff profiles */}
          {profileContext !== 'staff' && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 min-w-0">
            <div className="bg-card p-3 sm:p-4 rounded-xl border border-border min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
              <p className="text-2xl font-bold">{vehicles.length}</p>
            </div>
            <div className="bg-card p-3 sm:p-4 rounded-xl border border-border min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Total Bookings</p>
              <p className="text-2xl font-bold">{bookings.length}</p>
            </div>
          </div>
          )}
        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-2 min-w-0 max-w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0 max-w-full">
            <div className="mb-6 min-w-0 max-w-full w-full overflow-x-auto">
              <TabsList className="inline-flex w-max justify-start border-b border-border bg-transparent p-0 h-auto rounded-none">
                {profileContext !== 'staff' && (
                <TabsTrigger 
                  value="vehicles"
                  className="shrink-0 px-3 sm:px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Car className="w-4 h-4 shrink-0" />
                    <span className="text-xs sm:text-sm">Vehicles</span>
                  </div>
                </TabsTrigger>
                )}
                <TabsTrigger 
                  value="bookings"
                  className="shrink-0 px-3 sm:px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="text-xs sm:text-sm">Bookings</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="vehicles" className="space-y-4 min-w-0 max-w-full">
              {vehicles.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No vehicles registered</h3>
                  <p className="text-muted-foreground">This user hasn't added any vehicles yet.</p>
                </div>
              ) : (
                <div className="space-y-4 min-w-0 max-w-full">
                  {vehicles.map(vehicle => (
                    <VehicleCard 
                      key={vehicle._id} 
                      id={vehicle._id}
                      {...vehicle} 
                      className="min-w-0 max-w-full"
                      onClick={() => navigate(`/admin/vehicles/${vehicle._id}`)} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4 min-w-0 max-w-full">
              {bookings.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No booking history</h3>
                  <p className="text-muted-foreground">
                    {user.role === 'staff' 
                      ? "This staff member hasn't been assigned to any bookings yet." 
                      : "This user hasn't made any bookings yet."}
                  </p>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border overflow-hidden min-w-0 max-w-full">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-sm text-left min-w-[640px] sm:min-w-[800px]">
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
                                ₹{booking.finalAmount || booking.billing?.total || (booking.totalAmount + (booking.gstAmount || 0))}
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center shrink-0">
                <h2 className="text-xl font-semibold">Edit Profile</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-muted rounded-full border border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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
              
              <div className="p-4 sm:p-6 pb-24 sm:pb-6 bg-muted/30 border-t border-border flex justify-end gap-3 shrink-0">
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
