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
    maxDiscountAmount: coupon?.maxDiscountAmount || '',
    minOrderAmount: coupon?.minOrderAmount || 0,
    usageLimit: coupon?.usageLimit || '',
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

        const newUsers = data.map((row: any) => {
          const email = (row.Email || row.email || row.EMAIL || row['E-mail'] || '').toString().trim();
          const mobile = (row.Phone || row.phone || row.Mobile || row.mobile || row.MOBILE || row.PHONE || row.Contact || '').toString().trim();
          return { email: email || undefined, mobile: mobile || undefined };
        }).filter(user => user.email || user.mobile);

        if (newUsers.length === 0) {
          toast.error('No valid Email or Phone numbers found in the sheet');
          return;
        }

        setFormData(prev => ({
          ...prev,
          targetUsers: [...prev.targetUsers, ...newUsers]
        }));
        
        toast.success(`Imported ${newUsers.length} users from Excel`);
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
    if (!newUser.email && !newUser.mobile) {
      toast.error('Please enter at least email or mobile');
      return;
    }
    setFormData(prev => ({
      ...prev,
      targetUsers: [...prev.targetUsers, { ...newUser }]
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
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cleanedData = {
      ...formData,
      maxDiscountAmount: formData.maxDiscountAmount === '' ? null : Number(formData.maxDiscountAmount),
      usageLimit: formData.usageLimit === '' ? null : Number(formData.usageLimit),
      minOrderAmount: Number(formData.minOrderAmount) || 0,
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
                <label className="block text-sm font-semibold mb-2">Coupon Code</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. SAVE10"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all uppercase"
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
                <label className="block text-sm font-semibold mb-2">Max Discount Amount (₹)</label>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount}
                  onChange={handleChange}
                  min="0"
                  placeholder="Leave empty for no limit"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Min Order Amount (₹)</label>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={formData.minOrderAmount}
                  onChange={handleChange}
                  min="0"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Usage Limit</label>
                <input
                  type="number"
                  name="usageLimit"
                  value={formData.usageLimit}
                  onChange={handleChange}
                  min="1"
                  placeholder="Leave empty for unlimited"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Valid From</label>
                <input
                  type="date"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Valid Until</label>
                <input
                  type="date"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
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
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="tel"
                        placeholder="Mobile number"
                        value={newUser.mobile}
                        onChange={(e) => setNewUser(prev => ({ ...prev, mobile: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={addUser}
                      size="sm"
                      className="h-9"
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
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional description for the coupon"
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[80px]"
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
            Save Coupon
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminCouponsPage;
