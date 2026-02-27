import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Camera, Save, Plus, Trash2, CreditCard, Home, Car } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { userService } from '@/services/userService';
import VehicleCard from '@/components/VehicleCard';
import LocationPicker, { LocationValue } from '@/components/LocationPicker';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Address Form State
  const [newAddress, setNewAddress] = useState({ label: 'Home', address: '', lat: 12.9716, lng: 77.5946 });
  
  // Payment Form State
  const [newPayment, setNewPayment] = useState({ type: 'card', label: '', details: '' });

  useEffect(() => {
    const fetchVehicles = async () => {
        try {
            const data = await vehicleService.getVehicles();
            setMyVehicles(data);
        } catch (error) {
            console.error('Failed to fetch vehicles', error);
        }
    };
    if (user) {
        fetchVehicles();
        // Refresh user data to ensure we have latest addresses/payments
        // (Assuming auth check does this or we can force fetch)
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await userService.updateProfile({ 
        name: formData.name, 
        email: formData.email, 
        phone: formData.phone 
      });
      updateUser(updated);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.address) return;
    try {
      const currentAddresses = user?.addresses || [];
      const updatedAddresses = [...currentAddresses, { ...newAddress, isDefault: currentAddresses.length === 0 }];
      const updatedUser = await userService.updateProfile({ addresses: updatedAddresses });
      updateUser(updatedUser);
      setIsAddressModalOpen(false);
      setNewAddress({ label: 'Home', address: '', lat: 12.9716, lng: 77.5946 });
      toast.success('Address added');
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const handleDeleteAddress = async (index: number) => {
    try {
      const currentAddresses = user?.addresses || [];
      const updatedAddresses = currentAddresses.filter((_, i) => i !== index);
      const updatedUser = await userService.updateProfile({ addresses: updatedAddresses });
      updateUser(updatedUser);
      toast.success('Address removed');
    } catch (error) {
      toast.error('Failed to remove address');
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.label) return;
    try {
      const currentPayments = user?.paymentMethods || [];
      const updatedPayments = [...currentPayments, { ...newPayment, isDefault: currentPayments.length === 0 }];
      const updatedUser = await userService.updateProfile({ paymentMethods: updatedPayments });
      updateUser(updatedUser);
      setIsPaymentModalOpen(false);
      setNewPayment({ type: 'card', label: '', details: '' });
      toast.success('Payment method added');
    } catch (error) {
      toast.error('Failed to add payment method');
    }
  };

  const handleDeletePayment = async (index: number) => {
    try {
      const currentPayments = user?.paymentMethods || [];
      const updatedPayments = currentPayments.filter((_, i) => i !== index);
      const updatedUser = await userService.updateProfile({ paymentMethods: updatedPayments });
      updateUser(updatedUser);
      toast.success('Payment method removed');
    } catch (error) {
      toast.error('Failed to remove payment method');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
            <User className="w-10 h-10 text-white" />
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors">
            <Camera className="w-4 h-4 text-foreground" />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-semibold">{user?.name || 'User'}</h2>
        <p className="text-muted-foreground">{user?.email}</p>
      </motion.div>

      {/* Personal Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Personal Details
        </h3>
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" name="name" value={formData.name} onChange={handleChange} className="pl-10" placeholder="John Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" name="email" value={formData.email} onChange={handleChange} className="pl-10" placeholder="john@example.com" disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="pl-10" placeholder="+91 9876543210" />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>
      </section>

      {/* Saved Addresses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Saved Addresses
          </h3>
          <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Add Address
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Address</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Full Address</Label>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <LocationPicker
                      value={{
                        address: newAddress.address,
                        lat: newAddress.lat,
                        lng: newAddress.lng
                      }}
                      onChange={(val: LocationValue) => {
                        setNewAddress({
                          ...newAddress,
                          address: val.address,
                          lat: val.lat || 0,
                          lng: val.lng || 0
                        });
                      }}
                      mapClassName="h-[250px]"
                    />
                  </div>
                </div>
                <Button onClick={handleAddAddress} className="w-full">Save Address</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {user?.addresses && user.addresses.length > 0 ? (
            user.addresses.map((addr, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start group hover:border-primary/50 transition-colors">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{addr.label}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{addr.address}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteAddress(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
              No saved addresses yet.
            </div>
          )}
        </div>
      </section>

      {/* Payment Methods */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Payment Methods
          </h3>
          <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Add Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newPayment.type}
                    onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })}
                  >
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Label (e.g. HDFC Credit Card)</Label>
                  <Input 
                    value={newPayment.label} 
                    onChange={(e) => setNewPayment({ ...newPayment, label: e.target.value })} 
                    placeholder="My Card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Details (e.g. Last 4 digits)</Label>
                  <Input 
                    value={newPayment.details} 
                    onChange={(e) => setNewPayment({ ...newPayment, details: e.target.value })} 
                    placeholder="**** 1234"
                  />
                </div>
                <Button onClick={handleAddPayment} className="w-full">Save Payment Method</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {user?.paymentMethods && user.paymentMethods.length > 0 ? (
            user.paymentMethods.map((pm, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start group hover:border-primary/50 transition-colors">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{pm.label}</p>
                    <p className="text-xs font-medium uppercase text-muted-foreground">{pm.type}</p>
                    {pm.details && <p className="text-sm text-muted-foreground">{pm.details}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeletePayment(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
              No payment methods saved yet.
            </div>
          )}
        </div>
      </section>

      {/* Vehicles */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" /> My Vehicles
        </h3>
        <div className="space-y-3">
          {myVehicles.length > 0 ? (
             myVehicles.slice(0, 2).map((v) => (
                <VehicleCard key={v._id} id={v._id} {...v} compact onClick={() => {}} />
              ))
          ) : (
            <p className="text-muted-foreground text-sm">No vehicles found.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
