import React, { useEffect, useState } from 'react';
import { userService, User } from '@/services/userService';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Plus, 
  User as UserIcon, 
  Wrench, 
  Truck, 
  Shield, 
  MoreVertical,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminStaffPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    subRole: 'Driver'
  });
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  useEffect(() => {
    fetchUsers();

    // Socket Listener for Real-time Status
    socketService.connect();
    socketService.joinRoom('admin');

    socketService.on('userStatusUpdate', (data) => {
       setUsers(prevUsers => prevUsers.map(u => {
         if (u._id === data.userId) {
           return { ...u, isOnline: data.isOnline, lastSeen: data.lastSeen };
         }
         return u;
       }));
    });

    return () => {
       socketService.off('userStatusUpdate');
       socketService.leaveRoom('admin');
    };
  }, []);

  useEffect(() => {
    filterStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchQuery, roleFilter]);

  const fetchUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      // Filter only staff or admin roles that function as staff
      const staffMembers = data.filter((u: User) => u.role === 'staff' || u.role === 'admin');
      setUsers(staffMembers);
    } catch (error) {
      toast.error('Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  };

  const filterStaff = () => {
    let result = users;

    // Role Filter
    if (roleFilter !== 'all') {
      result = result.filter(u => u.subRole === roleFilter || (roleFilter === 'Admin' && u.role === 'admin'));
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

    setFilteredStaff(result);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.addStaff({
        ...newStaff,
        role: 'staff' // Default to staff role, subRole handles specialization
      });
      toast.success('Staff member added successfully');
      setShowAddModal(false);
      setNewStaff({ name: '', email: '', password: '', phone: '', subRole: 'Driver' });
      fetchUsers();
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to add staff');
    }
  };

  const handleDeleteStaff = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await userService.deleteUser(id);
        toast.success('Staff member deleted successfully');
        setUsers(users.filter(u => u._id !== id));
      } catch (error) {
        toast.error('Failed to delete staff member');
      }
    }
  };

  const getRoleIcon = (subRole?: string, role?: string) => {
    if (role === 'admin') return <Shield className="w-5 h-5 text-purple-600" />;
    switch (subRole) {
      case 'Driver': return <Truck className="w-5 h-5 text-blue-600" />;
      case 'Support': return <UserIcon className="w-5 h-5 text-green-600" />;
      default: return <UserIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Staff Management</h1>
          <p className="text-muted-foreground">Manage drivers and support staff.</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Staff</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search staff by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'Driver', 'Support', 'Admin'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                roleFilter === role 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {role === 'all' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading staff...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStaff.map((staff) => (
            <div 
              key={staff._id} 
              className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all cursor-pointer group relative"
              onClick={() => navigate(`/admin/users/${staff._id}`)} // Reusing User Detail for now, maybe specialized later
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                  {getRoleIcon(staff.subRole || undefined, staff.role)}
                </div>
                
                <div className="flex gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium 
                      ${staff.status === 'Inactive' ? 'bg-red-100 text-red-800' : 
                        staff.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {staff.status || 'Active'}
                    </div>
                    {/* Online Status Indicator */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${staff.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {staff.isOnline ? 'Online' : staff.lastSeen ? `Seen ${new Date(staff.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteStaff(staff._id, e)}
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="font-semibold text-lg truncate">{staff.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {staff.role === 'admin' ? 'Administrator' : staff.subRole || 'Staff Member'}
                </p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{staff.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{staff.phone || 'No phone'}</span>
                </div>
                {staff.subRole === 'Driver' && (
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/admin/tracking');
                      }}
                      className="flex items-center gap-2 text-blue-600 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                   >
                      <MapPin className="w-4 h-4" />
                      <span>Live Tracking Available</span>
                   </button>
                )}
              </div>
            </div>
          ))}
          
          {filteredStaff.length === 0 && (
             <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
               <UserIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
               <h3 className="text-lg font-medium">No staff found</h3>
               <p className="text-muted-foreground">Try adjusting your search or filters.</p>
             </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">Add New Staff Member</h2>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                  className="w-full p-2 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                  className="w-full p-2 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newStaff.phone}
                  onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                  className="w-full p-2 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newStaff.subRole}
                  onChange={e => setNewStaff({...newStaff, subRole: e.target.value})}
                  className="w-full p-2 rounded-lg border border-border bg-background"
                >
                  <option value="Driver">Pickup Driver</option>
                  <option value="Support">Support Agent</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showStaffPassword ? 'text' : 'password'}
                    required
                    value={newStaff.password}
                    onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                    className="w-full p-2 pr-10 rounded-lg border border-border bg-background"
                    placeholder="Create a temporary password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffPage;
