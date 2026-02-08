
import React, { useEffect, useState } from 'react';
import { userService, User } from '@/services/userService';
import { toast } from 'sonner';
import { Check, Shield, User as UserIcon, Briefcase, Users, X, Eye, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // States for modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators can manage users.</p>
      </div>
    );
  }

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await userService.approveUser(id);
      setUsers(users.map(u => u._id === id ? { ...u, isApproved: true, rejectionReason: null } : u));
      toast.success('User approved successfully');
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleRejectClick = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(user);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const submitRejection = async () => {
    if (!selectedUser) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await userService.rejectUser(selectedUser._id, rejectionReason);
      setUsers(users.map(u => u._id === selectedUser._id ? { ...u, isApproved: false, rejectionReason } : u));
      toast.success('User rejected');
      setIsRejectModalOpen(false);
    } catch (error) {
      toast.error('Failed to reject user');
    }
  };

  const handleViewDetails = (user: User) => {
    navigate(`/admin/users/${user._id}`);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'merchant': return <Briefcase className="w-4 h-4 text-blue-500" />;
      case 'staff': return <Users className="w-4 h-4 text-purple-500" />;
      default: return <UserIcon className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.isApproved) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Approved
        </span>
      );
    }
    if (user.rejectionReason) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Pending
      </span>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 relative p-6 max-w-[1600px] mx-auto">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Manage Users</h1>
            <p className="text-muted-foreground">View and manage all registered users.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 appearance-none rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Customers</option>
                  <option value="merchant">Merchants</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admins</option>
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
             </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[800px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Contact</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found matching "{searchQuery}"</td></tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={user._id} 
                        onClick={() => handleViewDetails(user)}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 capitalize">
                          {getRoleIcon(user.role)}
                          {user.role}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {user.phone || '-'}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewDetails(user); }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {!user.isApproved && !user.rejectionReason && (
                            <>
                              <button
                                onClick={(e) => handleApprove(user._id, e)}
                                className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleRejectClick(user, e)}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {user.rejectionReason && (
                             <button
                             onClick={(e) => handleApprove(user._id, e)}
                             className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                             title="Re-Approve"
                           >
                             <Check className="w-4 h-4" />
                           </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {isRejectModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">Reject User</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Please provide a reason for rejecting <span className="font-medium text-foreground">{selectedUser.name}</span>.
                </p>
                
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full h-32 p-3 rounded-xl bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  autoFocus
                />
              </div>
              <div className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                <button 
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 bg-background border border-border hover:bg-muted rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitRejection}
                  className="px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-sm font-medium transition-colors"
                >
                  Reject User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsersPage;
