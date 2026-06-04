import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Calendar, Percent, Tag, CheckCircle, XCircle, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { couponService, Coupon } from '@/services/couponService';
import { socketService } from '@/services/socket';
import GlobalSyncRefresh from '@/components/GlobalSyncRefresh';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isValidEmail, isValidPhone10, isValidDate, isDisposableEmail } from '@/lib/formValidation';

const AdminCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const fetchCoupons = async () => {
    try {
      const data = await couponService.getCoupons();
      setCoupons(data);
    } catch (error) {
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();

    socketService.connect();
    socketService.joinRoom('admin');

    return () => {
      socketService.leaveRoom('admin');
    };
  }, []);

  const handleSave = async (couponData: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    try {
      if (selectedCoupon) {
        await couponService.updateCoupon(selectedCoupon._id, couponData);
        toast.success('Coupon updated successfully');
      } else {
        await couponService.createCoupon(couponData);
        toast.success('Coupon created successfully');
      }
      fetchCoupons();
      setShowModal(false);
      setSelectedCoupon(null);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save coupon';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await couponService.deleteCoupon(id);
        toast.success('Coupon deleted successfully');
        fetchCoupons();
      } catch (error) {
        toast.error('Failed to delete coupon');
      }
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await couponService.updateCoupon(coupon._id, {
        isActive: !coupon.isActive
      });
      toast.success(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'}`);
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to update coupon');
    }
  };

  const isCouponExpired = (coupon: Coupon) => {
    return new Date(coupon.validUntil) < new Date();
  };

  return (
    <GlobalSyncRefresh entities={['coupon']} onSync={fetchCoupons}>
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <button
          onClick={() => {
            setSelectedCoupon(null);
            setShowModal(true);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Add Coupon
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {coupons.map((coupon) => (
            <motion.div
              key={coupon._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card p-4 rounded-lg shadow-sm border border-border"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Tag className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base sm:text-lg font-semibold truncate">{coupon.code}</h2>
                      {coupon.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                      {isCouponExpired(coupon) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                          <Calendar size={12} /> Expired
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Percent size={14} />
                        {coupon.discountPercentage}% off
                      </span>
                      {coupon.maxDiscountAmount && (
                        <span>Max: ₹{coupon.maxDiscountAmount}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>
                        {new Date(coupon.validFrom).toLocaleDateString()} - {new Date(coupon.validUntil).toLocaleDateString()}
                      </span>
                      {coupon.usageLimit && (
                        <span>
                          Used: {coupon.usageCount}/{coupon.usageLimit}
                        </span>
                      )}
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${coupon._id}`} className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Active</Label>
                    <Switch
                      id={`active-${coupon._id}`}
                      checked={coupon.isActive}
                      onCheckedChange={() => handleToggleActive(coupon)}
                      className="scale-75 sm:scale-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCoupon(coupon);
                        setShowModal(true);
                      }}
                      className="p-2 sm:px-3 sm:py-1 text-sm bg-muted text-muted-foreground rounded-md transition-colors hover:bg-muted/80"
                      title="Edit Coupon"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon._id)}
                      className="p-2 sm:px-3 sm:py-1 text-sm bg-destructive text-destructive-foreground rounded-md transition-colors hover:bg-destructive/80"
                      title="Delete Coupon"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {coupons.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No coupons yet. Create your first coupon!</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CouponModal
          coupon={selectedCoupon}
          onClose={() => {
            setShowModal(false);
            setSelectedCoupon(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
    </GlobalSyncRefresh>
  );
};

const CouponModal = ({ coupon, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    code: coupon?.code || '',

    discountPercentage: coupon?.discountPercentage || 10,
    maxDiscountAmount: coupon?.maxDiscountAmount !== undefined ? coupon.maxDiscountAmount : '',
    minOrderAmount: coupon?.minOrderAmount !== undefined ? coupon.minOrderAmount : '',
    usageLimit: coupon?.usageLimit !== undefined ? coupon.usageLimit : '',
    validFrom: coupon?.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: coupon?.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: coupon?.isActive !== undefined ? coupon.isActive : true,
    applicableServices: coupon?.applicableServices || ['All'],
    targetUsers: coupon?.targetUsers || [],
    description: coupon?.description || '',
  });

  const [newUser, setNewUser] = useState({ email: '', mobile: '' });

  const services = ['All', 'General Service', 'Car Wash', 'Essentials', 'Tyres and Battery'];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error('Excel sheet is empty');
          return;
        }

        const newUsers = [];
        let invalidEntries = 0;

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as Record<string, any>;
          const email = (row.Email || row.email || row.EMAIL || row['E-mail'] || '').toString().trim().toLowerCase();
          const mobile = (row.Phone || row.phone || row.Mobile || row.mobile || row.MOBILE || row.PHONE || row.Contact || '').toString().trim();
          
          if (!email || !mobile) {
            invalidEntries++;
            continue;
          }
          if (email.length > 100) {
            invalidEntries++;
            continue;
          }
          if (isDisposableEmail(email)) {
            invalidEntries++;
            continue;
          }
          if (!isValidEmail(email)) {
            invalidEntries++;
            continue;
          }
          if (!isValidPhone10(mobile)) {
            invalidEntries++;
            continue;
          }
          const cleanedMobile = mobile.replace(/\D/g, '');
          newUsers.push({ email, mobile: cleanedMobile });
        }

        if (newUsers.length === 0) {
          toast.error('No valid Email or Phone numbers found in the sheet');
          return;
        }

        setFormData(prev => ({
          ...prev,
          targetUsers: [...prev.targetUsers, ...newUsers]
        }));
        
        toast.success(`Imported ${newUsers.length} users from Excel${invalidEntries > 0 ? ` (${invalidEntries} invalid entries skipped)` : ''}`);
      } catch (err) {
        toast.error('Failed to parse Excel file');
        console.error(err);
      }
    };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const addUser = () => {
    const email = newUser.email.trim();
    const mobile = newUser.mobile.trim();
    if (!email) {
      toast.error('Please fill out this field');
      return;
    }
    if (!mobile) {
      toast.error('Please fill out this field');
      return;
    }
    if (email.length > 100) {
      toast.error('Email cannot exceed 100 characters');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Enter a valid email address');
      return;
    }
    if (!isValidPhone10(mobile)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setFormData(prev => ({
      ...prev,
      targetUsers: [...prev.targetUsers, { email, mobile: mobile ? mobile.replace(/\D/g, '') : '' }]
    }));
    setNewUser({ email: '', mobile: '' });
  };

  const removeUser = (index: number) => {
    setFormData(prev => ({
      ...prev,
      targetUsers: prev.targetUsers.filter((_, i) => i !== index)
    }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => {
      let newServices;
      if (service === 'All') {
        newServices = prev.applicableServices.includes('All') ? [] : ['All'];
      } else {
        newServices = prev.applicableServices.filter(s => s !== 'All');
        if (newServices.includes(service)) {
          newServices = newServices.filter(s => s !== service);
        } else {
          newServices = [...newServices, service];
        }
        if (newServices.length === 0) newServices = ['All'];
      }
      return { ...prev, applicableServices: newServices };
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let finalValue = value;
    if (type === 'number') {
      if (name === 'discountPercentage' && value.length > 3) {
        finalValue = value.slice(0, 3);
      } else if (['maxDiscountAmount', 'minOrderAmount', 'usageLimit'].includes(name) && value.length > 6) {
        finalValue = value.slice(0, 6);
      }
    } else if (type === 'date') {
      if (value.length > 10) {
        finalValue = value.slice(0, 10);
      }
      if (value && !isValidDate(value)) {
        toast.error('Please enter a valid date');
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (finalValue === '' ? '' : Number(finalValue)) : finalValue
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validFrom = new Date(formData.validFrom);
    const validUntil = new Date(formData.validUntil);

    if (!isValidDate(formData.validFrom)) {
      toast.error('Please enter a valid date for Valid From');
      return;
    }
    if (!isValidDate(formData.validUntil)) {
      toast.error('Please enter a valid date for Valid Until');
      return;
    }

    if (!formData.code.trim()) {
      toast.error('Please fill out this field');
      return;
    }
    // Validate coupon code: only alphanumeric, underscores, and hyphens
    const couponCodeRegex = /^[A-Z0-9_-]+$/i;
    if (!couponCodeRegex.test(formData.code.trim())) {
      toast.error('Please enter valid data');
      return;
    }
    // Validate coupon code length
    if (formData.code.trim().length > 10) {
      toast.error('Coupon code cannot exceed 10 characters');
      return;
    }
    if (formData.discountPercentage === '') {
      toast.error('Please fill out this field');
      return;
    }
    if (Number(formData.discountPercentage) < 1 || Number(formData.discountPercentage) > 100) {
      toast.error('Discount percentage must be between 1 and 100');
      return;
    }
    if (formData.minOrderAmount === '') {
      toast.error('Please fill out this field');
      return;
    }
    if (Number(formData.minOrderAmount) < 0) {
      toast.error('Min order amount cannot be negative');
      return;
    }
    if (Number(formData.minOrderAmount) > 999999) {
      toast.error('Min order amount cannot exceed 999999');
      return;
    }
    if (formData.maxDiscountAmount === '') {
      toast.error('Please fill out this field');
      return;
    }
    if (Number(formData.maxDiscountAmount) < 0) {
      toast.error('Max discount cannot be negative');
      return;
    }
    if (Number(formData.maxDiscountAmount) > 999999) {
      toast.error('Max discount cannot exceed 999999');
      return;
    }
    if (formData.usageLimit === '') {
      toast.error('Please fill out this field');
      return;
    }
    if (Number(formData.usageLimit) < 1 || Number(formData.usageLimit) > 999999) {
      toast.error('Usage limit must be between 1 and 999999');
      return;
    }
    if (validUntil < validFrom) {
      toast.error('Valid until date must be after valid from date');
      return;
    }
    if (formData.description.length > 30) {
      toast.error('Description cannot exceed 30 characters');
      return;
    }
    const descriptionRegex = /^[\w\s.,!?'"()-]*$/;
    if (!descriptionRegex.test(formData.description)) {
      toast.error('Please enter valid data in Description field');
      return;
    }
    
    const cleanedData = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      maxDiscountAmount: Number(formData.maxDiscountAmount),
      usageLimit: Number(formData.usageLimit),
      minOrderAmount: Number(formData.minOrderAmount),
      targetUsers: formData.targetUsers,
    };
    onSave(cleanedData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-lg w-full max-w-lg flex flex-col max-h-[90vh] shadow-xl"
      >
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">{coupon ? 'Edit Coupon' : 'Add New Coupon'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="coupon-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold">Coupon Code</label>
                  <span className="text-xs text-muted-foreground">{formData.code.length}/10 characters</span>
                </div>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. SAVE10"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all uppercase"
                  maxLength={10}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Discount Percentage (%)</label>
                <input
                  type="number"
                  name="discountPercentage"
                  value={formData.discountPercentage}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold">Max Discount Amount (₹)</label>
                  <span className="text-xs text-muted-foreground">{formData.maxDiscountAmount.toString().length}/6 digits</span>
                </div>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount}
                  onChange={handleChange}
                  min="0"
                  max="999999"
                  placeholder="Enter max discount amount"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold">Min Order Amount (₹)</label>
                  <span className="text-xs text-muted-foreground">{formData.minOrderAmount.toString().length}/6 digits</span>
                </div>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={formData.minOrderAmount}
                  onChange={handleChange}
                  min="0"
                  max="999999"
                  placeholder="Enter min order amount"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold">Usage Limit</label>
                  <span className="text-xs text-muted-foreground">{formData.usageLimit.toString().length}/6 digits</span>
                </div>
                <input
                  type="number"
                  name="usageLimit"
                  value={formData.usageLimit}
                  onChange={handleChange}
                  min="1"
                  max="999999"
                  placeholder="Enter usage limit"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold">Valid From</label>
                  <span className="text-xs text-muted-foreground">{formData.validFrom.toString().length}/10 characters</span>
                </div>
                <input
                  type="date"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  max="2100-12-31"
                  maxLength={10}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold">Valid Until</label>
                  <span className="text-xs text-muted-foreground">{formData.validUntil.toString().length}/10 characters</span>
                </div>
                <input
                  type="date"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  max="2100-12-31"
                  maxLength={10}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 py-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive" className="font-semibold cursor-pointer">Active</Label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-3">Applicable Services</label>
                <div className="flex flex-wrap gap-2">
                  {services.map(service => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => handleServiceToggle(service)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        formData.applicableServices.includes(service)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-foreground">Target Users (Email, Mobile)</label>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg cursor-pointer hover:bg-primary/20 transition-all border border-primary/20 font-medium">
                    <FileUp size={14} />
                    <span>Upload Excel</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="block text-xs font-medium text-muted-foreground">
                          Email address
                        </Label>
                        <span className="text-[10px] text-muted-foreground">{newUser.email.length}/100 characters</span>
                      </div>
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUser(); } }}
                        className="h-9 text-sm"
                        maxLength={100}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="block text-xs font-medium text-muted-foreground">
                          Mobile number
                        </Label>
                        <span className="text-[10px] text-muted-foreground">{newUser.mobile.length}/10 digits</span>
                      </div>
                      <Input
                        type="tel"
                        placeholder="Mobile number"
                        value={newUser.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setNewUser(prev => ({ ...prev, mobile: val }));
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUser(); } }}
                        className="h-9 text-sm"
                        maxLength={10}
                      />
                    </div>
                    <Button 
                      type="button" 
                      size="sm"
                      className="h-9"
                      onClick={addUser}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden bg-background">
                    <div className="max-h-[200px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-semibold text-muted-foreground">Email</th>
                            <th className="text-left p-2 font-semibold text-muted-foreground">Mobile</th>
                            <th className="w-10 p-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {formData.targetUsers.length > 0 ? (
                            formData.targetUsers.map((user, index) => (
                              <tr key={index} className="hover:bg-muted/30 transition-colors">
                                <td className="p-2 truncate max-w-[150px]" title={user.email}>{user.email || '-'}</td>
                                <td className="p-2">{user.mobile || '-'}</td>
                                <td className="p-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeUser(index)}
                                    className="p-1 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                  >
                                    <Trash size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-muted-foreground italic">
                                No target users added yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold">
                    Description (Max 30 characters)
                  </label>
                  <span className="text-xs text-muted-foreground">{formData.description.length}/30 characters</span>
                </div>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter coupon description"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[80px]"
                  required
                  maxLength={30}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="coupon-form"
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium shadow-sm active:scale-[0.98]"
          >
            {coupon ? 'Save changes' : 'Save Coupon'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminCouponsPage;
