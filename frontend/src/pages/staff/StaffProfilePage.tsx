import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { userService } from '@/services/userService';
import { isNameTooLong, isValidName, isValidPhone10 } from '@/lib/formValidation';

const StaffProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    if (isNameTooLong(formData.name)) {
      toast.error('Too long data: Please enter a maximum of 20 characters');
      return;
    }
    if (!isValidName(formData.name)) {
      toast.error('Please enter valid data');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone Number is required');
      return;
    }
    if (!isValidPhone10(formData.phone)) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }

    try {
      const updatedUser = await userService.updateProfile(formData);
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setIsEditing(false);
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="container-mobile space-y-6 no-horizontal-scroll"
    >
      <motion.div variants={staggerItem}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">My Profile</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your personal information and settings
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="space-y-6">
        {/* Profile Header */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">
                {user?.name || 'Staff Member'}
              </h2>
              <p className="text-muted-foreground capitalize">
                {user?.role || 'Staff'} {user?.subRole && `• ${user.subRole}`}
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="space-y-4">
            {/* Name */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="text-foreground">{user?.name || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed focus:outline-none"
                  />
                ) : (
                  <p className="text-foreground">{user?.email || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Phone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="text-foreground">{user?.phone || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-sm">{user?._id || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize">{user?.role || 'Staff'}</span>
            </div>
            {user?.subRole && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Sub Role</span>
                <span className="capitalize">{user.subRole}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account Status</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StaffProfilePage;