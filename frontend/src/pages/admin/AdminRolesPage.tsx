import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { roleService } from '../../services/roleService';
import { toast } from 'react-hot-toast';

interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  'Dashboard',
  'Customers',
  'Vehicles',
  'Bookings',
  'Staff',
  'Merchants',
  'Approvals',
  'Tracking',
  'Payments',
  'Documents',
  'Insurance',
  'Stock',
  'Support',
  'Feedback',
  'Notifications',
  'Reports',
  'Roles',
  'Settings',
  'Audit Logs'
];

const AdminRolesPage = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role: Role | null = null) => {
    if (role) {
      setEditingRole(role);
      setName(role.name);
      setDescription(role.description || '');
      setSelectedPermissions(role.permissions || []);
    } else {
      setEditingRole(null);
      setName('');
      setDescription('');
      setSelectedPermissions([]);
    }
    setShowModal(true);
  };

  const togglePermission = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPermissions.length === AVAILABLE_PERMISSIONS.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions([...AVAILABLE_PERMISSIONS]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Role name is required');
      return;
    }

    try {
      const payload = { name, description, permissions: selectedPermissions };
      if (editingRole) {
        await roleService.updateRole(editingRole._id, payload);
        toast.success('Role updated successfully');
      } else {
        await roleService.createRole(payload);
        toast.success('Role created successfully');
      }
      setShowModal(false);
      fetchRoles();
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save role';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await roleService.deleteRole(id);
        toast.success('Role deleted');
        fetchRoles();
      } catch (error) {
        toast.error('Failed to delete role');
      }
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading roles...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Role & Permission Control</h1>
          <p className="text-gray-600">Manage access levels and permissions for staff and admins</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Create New Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <motion.div
            key={role._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{role.name}</h3>
                  <p className="text-sm text-gray-500">{role.permissions?.length || 0} Permissions</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(role)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(role._id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
              {role.description || 'No description provided.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {role.permissions?.slice(0, 5).map((perm: string) => (
                <span key={perm} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  {perm}
                </span>
              ))}
              {(role.permissions?.length || 0) > 5 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                  +{role.permissions.length - 5} more
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create/Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Finance Manager"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the role's responsibilities..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Permissions</label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedPermissions.length === AVAILABLE_PERMISSIONS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <button
                      key={perm}
                      type="button"
                      onClick={() => togglePermission(perm)}
                      className={`px-3 py-2 rounded-lg text-sm border text-left flex items-center justify-between transition-all ${
                        selectedPermissions.includes(perm)
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {perm}
                      {selectedPermissions.includes(perm) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminRolesPage;
