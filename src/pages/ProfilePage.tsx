import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Camera, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { vehicles } from '@/services/dummyData';
import VehicleCard from '@/components/VehicleCard';
import { toast } from 'sonner';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '123 Main Street, Downtown',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: formData.name, email: formData.email, phone: formData.phone });
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center">
            <User className="w-12 h-12 text-primary-foreground" />
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Camera className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-semibold">{user?.name || 'User'}</h2>
        <p className="text-muted-foreground">{user?.email}</p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full name" className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="relative">
          <MapPin className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
          <textarea name="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Address" rows={3} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </div>
        <button type="submit" className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90">
          <Save className="w-5 h-5" /> Save Changes
        </button>
      </form>

      {/* Vehicles */}
      <div>
        <h3 className="text-lg font-semibold mb-4">My Vehicles</h3>
        <div className="space-y-3">
          {vehicles.slice(0, 2).map((v) => (
            <VehicleCard key={v.id} {...v} compact onClick={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
