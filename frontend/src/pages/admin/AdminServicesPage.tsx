import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash, Upload, Loader2, Calendar, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { serviceService, Service } from '@/services/serviceService';
import { uploadService } from '@/services/uploadService';
import { socketService } from '@/services/socket';
import GlobalSyncRefresh from '@/components/GlobalSyncRefresh';
import { bookingService } from '@/services/bookingService';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatLocalYmd } from '@/lib/utils';
import { 
  isValidName, 
  isNameTooLong, 
  isDescriptionTooLong, 
  isPriceTooLong, 
  isDurationTooLong, 
  isEstimationTimeTooLong, 
  isValidImageUrl, 
  isImageUrlTooLong, 
  isValidFeature, 
  isFeatureTooLong,
  isValidDate,
  hasExcessiveRepeatedChars,
  isValidDescription,
  isValidEstimationTime
} from '@/lib/formValidation';

const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'slots' | 'available-pincodes'>('services');
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>(formatLocalYmd(new Date()));
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [allSlots, setAllSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotSaving, setSlotSaving] = useState(false);
  const [availableServicePincodes, setAvailableServicePincodes] = useState<string[]>([]);
  const [availableServicePincodeInput, setAvailableServicePincodeInput] = useState('');
  const [availableServiceSaving, setAvailableServiceSaving] = useState(false);

  const parsePincodes = (input: string): string[] => {
    const raw = String(input || '');
    const parts = raw
      .split(/[,\s]+/g)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => p.replace(/\D/g, ''))
      .filter((p) => p.length === 6);
    return Array.from(new Set(parts));
  };

  const fetchServices = async () => {
    try {
      const data = await serviceService.getServices();
      setServices(data);
    } catch (error) {
      toast.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();

    // Socket Setup
    socketService.connect();
    socketService.joinRoom('admin');

    return () => {
      socketService.leaveRoom('admin');
    };
  }, []);

  const handleSave = async (serviceData: Omit<Service, '_id'>) => {
    try {
      if (selectedService) {
        await serviceService.updateService(selectedService._id, serviceData);
        toast.success('Service updated successfully');
      } else {
        await serviceService.createService(serviceData);
        toast.success('Service created successfully');
      }
      fetchServices();
      setShowModal(false);
      setSelectedService(null);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save service';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await serviceService.deleteService(id);
        toast.success('Service deleted successfully');
        fetchServices();
      } catch (error) {
        toast.error('Failed to delete service');
      }
    }
  };

  const handleToggleQuickService = async (service: Service) => {
    try {
      await serviceService.updateService(service._id, {
        isQuickService: !service.isQuickService
      });
      toast.success(`Service ${!service.isQuickService ? 'added to' : 'removed from'} services`);
      fetchServices();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const fetchAdminSlots = async () => {
    if (!selectedSlotDate) return;
    try {
      setSlotLoading(true);
      const data = await bookingService.getAdminSlots(selectedSlotDate, selectedCategory);
      setAllSlots(Array.isArray(data.allSlots) ? data.allSlots : []);
      setBookedSlots(Array.isArray(data.bookedSlots) ? data.bookedSlots : []);
      setBlockedSlots(Array.isArray(data.blockedSlots) ? data.blockedSlots : []);
    } catch (error) {
      toast.error('Failed to fetch slots');
    } finally {
      setSlotLoading(false);
    }
  };

  const fetchAvailableServicePincodes = async () => {
    try {
      const data = await bookingService.getAvailableServicePincodes();
      const list = Array.isArray(data?.availablePincodes) ? data.availablePincodes : [];
      setAvailableServicePincodes(list);
      setAvailableServicePincodeInput('');
    } catch (error) {
      toast.error('Failed to load available service pincodes');
    }
  };

  useEffect(() => {
    if (activeTab === 'slots') {
      fetchAdminSlots();
    }
    if (activeTab === 'available-pincodes') {
      fetchAvailableServicePincodes();
    }
  }, [activeTab, selectedSlotDate, selectedCategory]);

  const toggleBlockedSlot = (slot: string) => {
    if (bookedSlots.includes(slot)) return;
    setBlockedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const blockAllSlots = () => {
    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));
    setBlockedSlots(availableSlots);
  };

  const clearAllBlocks = () => {
    setBlockedSlots([]);
  };

  const handleSaveBlockedSlots = async () => {
    if (!selectedSlotDate) return;
    try {
      setSlotSaving(true);
      await bookingService.updateAdminBlockedSlots(selectedSlotDate, blockedSlots, selectedCategory);
      toast.success('Slot blocks updated');
      fetchAdminSlots();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update blocked slots');
    } finally {
      setSlotSaving(false);
    }
  };

  const handleSaveAvailableServicePincodes = async () => {
    // First, check if there are any pending invalid pincodes in the input before saving
    const parsed = parsePincodes(availableServicePincodeInput);
    const rawInput = availableServicePincodeInput.trim();
    if (rawInput.length > 0) {
      const parts = rawInput.split(/[,\s]+/g).map(p => p.trim()).filter(Boolean);
      const invalidParts = parts.filter(p => {
        const digits = p.replace(/\D/g, '');
        return digits.length !== 6;
      });
      if (invalidParts.length > 0) {
        toast.error('Please enter valid 6-digit pincodes only');
        return;
      }
    }
    // If there are valid pending pincodes, add them first
    if (parsed.length > 0) {
      setAvailableServicePincodes((prev) => Array.from(new Set([...prev, ...parsed])));
      setAvailableServicePincodeInput('');
    }
    try {
      setAvailableServiceSaving(true);
      await bookingService.updateAvailableServicePincodes(availableServicePincodes);
      toast.success('Available service pincodes updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update available service pincodes');
    } finally {
      setAvailableServiceSaving(false);
    }
  };

  const addPincodesFromInput = () => {
    const parsed = parsePincodes(availableServicePincodeInput);
    const rawInput = availableServicePincodeInput.trim();
    if (rawInput.length > 0) {
      // Check if there are any invalid parts in the input
      const parts = rawInput.split(/[,\s]+/g).map(p => p.trim()).filter(Boolean);
      const invalidParts = parts.filter(p => {
        const digits = p.replace(/\D/g, '');
        return digits.length !== 6;
      });
      if (invalidParts.length > 0) {
        toast.error('Please enter valid 6-digit pincodes only');
        return;
      }
    }
    if (parsed.length === 0) return;
    setAvailableServicePincodes((prev) => Array.from(new Set([...prev, ...parsed])));
    setAvailableServicePincodeInput('');
  };

  const removeAvailablePincode = (pincode: string) => {
    setAvailableServicePincodes((prev) => prev.filter((p) => p !== pincode));
  };

  return (
    <GlobalSyncRefresh
      entities={['service', 'availableservicepincode', 'slotblock']}
      onSync={() => {
        fetchServices();
        if (activeTab === 'slots') fetchAdminSlots();
        if (activeTab === 'available-pincodes') fetchAvailableServicePincodes();
      }}
    >
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Services</h1>
        {activeTab === 'services' && (
          <button
            onClick={() => {
              setSelectedService(null);
              setShowModal(true);
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} />
            Add Service
          </button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'services' | 'slots' | 'available-pincodes')}>
        <TabsList className="mb-6">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="slots">Slots</TabsTrigger>
          <TabsTrigger value="available-pincodes">Available Pincodes</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No services found. Add a service to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <motion.div
                  key={service._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card p-4 rounded-lg shadow-sm border border-border"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <img src={service.image} alt={service.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-md object-cover shrink-0" />
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-semibold truncate">{service.name}</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">{service.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`quick-${service._id}`} className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Service</Label>
                        <Switch
                          id={`quick-${service._id}`}
                          checked={service.isQuickService}
                          onCheckedChange={() => handleToggleQuickService(service)}
                          className="scale-75 sm:scale-100"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedService(service);
                            setShowModal(true);
                          }}
                          className="p-2 sm:px-3 sm:py-1 text-sm bg-muted text-muted-foreground rounded-md transition-colors hover:bg-muted/80"
                          title="Edit Service"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(service._id)}
                          className="p-2 sm:px-3 sm:py-1 text-sm bg-destructive text-destructive-foreground rounded-md transition-colors hover:bg-destructive/80"
                          title="Delete Service"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="slots" className="space-y-4">
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Slot Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select a date and block available slots. Users will see blocked slots as booked.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="All">All Services</option>
                  <option value="General Services">General Services</option>
                  <option value="Car Wash">Car Wash</option>
                  <option value="Tyres & Battery">Tyres & Battery</option>
                  <option value="Essentials">Essentials</option>
                </select>
                <input
                  type="date"
                  value={selectedSlotDate}
                  min={formatLocalYmd(new Date())}
                  max="2100-12-31"
                  maxLength={10}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (newDate) {
                      if (newDate.length > 10) {
                        toast.error('Too long data: Please enter a valid date in YYYY-MM-DD format');
                        return;
                      }
                      if (!isValidDate(newDate)) {
                        toast.error('Please enter a valid date');
                        return;
                      }
                    }
                    setSelectedSlotDate(newDate);
                  }}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-1 border-l border-border pl-2 mr-1">
                  <button
                    type="button"
                    onClick={blockAllSlots}
                    disabled={slotLoading}
                    className="text-[11px] font-medium text-destructive hover:underline px-2 py-1"
                  >
                    Block All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllBlocks}
                    disabled={slotLoading}
                    className="text-[11px] font-medium text-muted-foreground hover:underline px-2 py-1"
                  >
                    Clear All
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBlockedSlots}
                  disabled={slotSaving || slotLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {slotSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Save Blocks
                </button>
              </div>
            </div>

            {slotLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading slots...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {allSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    const isBlocked = blockedSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => toggleBlockedSlot(slot)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          isBooked
                            ? 'bg-muted text-muted-foreground border-border cursor-not-allowed line-through'
                            : isBlocked
                            ? 'bg-destructive/10 text-destructive border-destructive/40'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        {slot}
                        <span className="ml-2 text-[11px]">
                          {isBooked ? '(Booked)' : isBlocked ? '(Blocked)' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive/70" /> Blocked by admin</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Already booked</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/70" /> Available</span>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="available-pincodes" className="space-y-4">
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Available Service Pincodes</h2>
              <p className="text-sm text-muted-foreground">
                Customers can book only from these pincodes. Until you add at least one pincode, service bookings
                stay disabled on the customer app.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Add available pincode (max 100 characters)</Label>
              <input
                type="text"
                value={availableServicePincodeInput}
                onChange={(e) => {
                  // Only allow digits, spaces, and commas
                  const value = e.target.value.replace(/[^0-9,\s]/g, '');
                  // Check for total length (max reasonable length)
                  if (value.length > 100) {
                    toast.error('Too long data: Please enter pincodes within 100 characters');
                    return;
                  }
                  setAvailableServicePincodeInput(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addPincodesFromInput();
                  }
                }}
                onBlur={addPincodesFromInput}
                placeholder="e.g. 500032, 500008"
                maxLength={100}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {availableServicePincodes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {availableServicePincodes.map((pincode) => (
                    <span
                      key={pincode}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground"
                    >
                      {pincode}
                      <button
                        type="button"
                        onClick={() => removeAvailablePincode(pincode)}
                        className="rounded-sm px-1 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${pincode}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground">
                Active allowed pincodes:{' '}
                {availableServicePincodes.length > 0 ? (
                  availableServicePincodes.join(', ')
                ) : (
                  <span className="font-medium text-amber-700 dark:text-amber-500">
                    None — customer bookings are disabled until you add at least one pincode and save.
                  </span>
                )}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSaveAvailableServicePincodes}
                disabled={availableServiceSaving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {availableServiceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Save Available Pincodes
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showModal && (
        <ServiceModal
          service={selectedService}
          onClose={() => {
            setShowModal(false);
            setSelectedService(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
    </GlobalSyncRefresh>
  );
};

const ServiceModal = ({ service, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || 0,
    duration: service?.duration || 0,
    estimationTime: service?.estimationTime || '',
    category: service?.category || 'Services',
    vehicleType: service?.vehicleType || 'Car',
    image: service?.image || '',
    features: service?.features || [],
    isQuickService: service?.isQuickService || false,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    let isValid = true;
    let errorMessage = '';

    if (name === 'name') {
      if (value.length > 0) {
        if (hasExcessiveRepeatedChars(value)) {
          isValid = false;
          errorMessage = 'Too many repeated characters';
        } else if (!isValidName(value)) {
          isValid = false;
          errorMessage = 'Name contains invalid characters. Only letters, numbers, spaces, \', &, and - are allowed.';
        } else if (isNameTooLong(value)) {
          isValid = false;
          errorMessage = 'Too long data: Please enter a maximum of 30 characters';
        }
      }
    }
    
    if (name === 'description') {
      if (value.length > 0) {
        if (hasExcessiveRepeatedChars(value)) {
          isValid = false;
          errorMessage = 'Too many repeated characters';
        } else if (isDescriptionTooLong(value)) {
          isValid = false;
          errorMessage = 'Too long data: Please enter a maximum of 500 characters';
        }
      }
    }
    
    if (name === 'price') {
      if (isPriceTooLong(value)) {
        isValid = false;
        errorMessage = 'Too long data: Please enter a maximum of 10 characters';
      }
    }
    
    if (name === 'duration') {
      if (isDurationTooLong(value)) {
        isValid = false;
        errorMessage = 'Too long data: Please enter a maximum of 3 characters';
      }
    }
    
    if (name === 'estimationTime') {
      if (value.length > 0 && hasExcessiveRepeatedChars(value)) {
        isValid = false;
        errorMessage = 'Too many repeated characters';
      } else if (isEstimationTimeTooLong(value)) {
        isValid = false;
        errorMessage = 'Too long data: Please enter a maximum of 3 characters';
      }
    }
    
    if (name === 'image') {
      if (isImageUrlTooLong(value)) {
        isValid = false;
        errorMessage = 'Too long data: Please enter a maximum of 500 characters';
      } else if (value.trim() && !isValidImageUrl(value)) {
        isValid = false;
        errorMessage = 'Please enter valid data';
      }
    }

    if (!isValid) {
      toast.error(errorMessage);
      return; // Don't update state if validation fails
    }

    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value 
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadService.uploadFile(file);
      setFormData(prev => ({ ...prev, image: res.url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleFeatureChange = (index, value) => {
    if (isFeatureTooLong(value)) {
      toast.error('Too long data: Please enter a maximum of 100 characters');
      return;
    }
    if (hasExcessiveRepeatedChars(value)) {
      toast.error('Too many repeated characters');
      return;
    }
    if (value.trim() && !isValidFeature(value)) {
      toast.error('Please enter valid data');
      return;
    }
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData((prev) => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData((prev) => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeature = (index) => {
    const newFeatures = [...formData.features];
    newFeatures.splice(index, 1);
    setFormData((prev) => ({ ...prev, features: newFeatures }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // First, check native browser validation for required fields
    const form = e.target as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Now check custom validations
    if (!isValidName(formData.name)) {
      toast.error('Name contains invalid characters. Only letters, numbers, spaces, \', &, and - are allowed.');
      return;
    }
    if (isNameTooLong(formData.name)) {
      toast.error('Too long data: Please enter a maximum of 30 characters');
      return;
    }
    if (hasExcessiveRepeatedChars(formData.name)) {
      toast.error('Too many repeated characters in name');
      return;
    }
    if (!isValidDescription(formData.description)) {
      toast.error('Please enter valid description');
      return;
    }
    if (isDescriptionTooLong(formData.description)) {
      toast.error('Too long data: Please enter a maximum of 500 characters');
      return;
    }
    if (hasExcessiveRepeatedChars(formData.description)) {
      toast.error('Too many repeated characters in description');
      return;
    }
    if (Number(formData.price) <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }
    if (isPriceTooLong(formData.price)) {
      toast.error('Too long data: Please enter a maximum of 10 characters');
      return;
    }
    if (Number(formData.duration) <= 0) {
      toast.error('Duration must be greater than 0');
      return;
    }
    if (isDurationTooLong(formData.duration)) {
      toast.error('Too long data: Please enter a maximum of 3 characters');
      return;
    }
    if (!isValidEstimationTime(formData.estimationTime)) {
      toast.error('Please enter valid estimation time');
      return;
    }
    if (isEstimationTimeTooLong(formData.estimationTime)) {
      toast.error('Too long data: Please enter a maximum of 3 characters');
      return;
    }
    if (!isValidImageUrl(formData.image)) {
      toast.error('Please enter valid data for image');
      return;
    }
    if (isImageUrlTooLong(formData.image)) {
      toast.error('Too long data: Please enter a maximum of 500 characters');
      return;
    }
    // Validate features
    for (const feature of formData.features) {
      if (feature.trim() && !isValidFeature(feature)) {
        toast.error('Please enter valid data for features');
        return;
      }
      if (isFeatureTooLong(feature)) {
        toast.error('Too long data: Please enter a maximum of 100 characters per feature');
        return;
      }
      if (hasExcessiveRepeatedChars(feature)) {
        toast.error('Too many repeated characters in feature');
        return;
      }
    }
    // Clean up features: remove empty ones
    const cleanedData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      estimationTime: formData.estimationTime.trim(),
      image: formData.image.trim(),
      features: formData.features.filter(f => f.trim() !== '')
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
        {/* Header - Fixed */}
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">{service ? 'Edit Service' : 'Add New Service'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="service-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">Name (max 30 characters)</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                maxLength={30}
                className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Description (max 500 characters)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  maxLength={500}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Price (max 10 characters)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="1"
                  maxLength={10}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Duration (minutes, max 3 characters)</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  maxLength={3}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
              <label className="block text-sm font-semibold mb-2">Estimation Time (max 3 characters)</label>
              <input
                type="text"
                name="estimationTime"
                value={formData.estimationTime}
                onChange={handleChange}
                placeholder="e.g. 2h"
                maxLength={3}
                className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                >
                  <option value="Services">Services</option>
                  <option value="Periodic">Periodic</option>
                  <option value="Wash">Wash</option>
                  <option value="Car Wash">Car Wash</option>
                  <option value="Tyre & Battery">Tyre & Battery</option>
                  <option value="Tyres">Tyres</option>
                  <option value="Battery">Battery</option>
                  <option value="Painting">Painting</option>
                  <option value="Denting">Denting</option>
                  <option value="Repair">Repair</option>
                  <option value="Detailing">Detailing</option>
                  <option value="AC">AC Service</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Essentials">Essentials</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center gap-2 py-2">
                <Switch
                  id="isQuickService"
                  checked={formData.isQuickService}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isQuickService: checked }))}
                />
                <Label htmlFor="isQuickService" className="font-semibold cursor-pointer">Show in Services</Label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Service Image (max 500 characters)</label>
                <div className="flex flex-col gap-4">
                  {formData.image && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                      <img src={formData.image} alt="Service" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder="Paste image URL here"
                      maxLength={500}
                      className="flex-1 p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold">Features (max 100 characters each)</label>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    + Add Feature
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder={`Feature ${index + 1}`}
                        maxLength={100}
                        className="flex-1 p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-2.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  ))}
                  {formData.features.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No features added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
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
            form="service-form"
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium shadow-sm active:scale-[0.98]"
          >
            Save Service
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminServicesPage;
