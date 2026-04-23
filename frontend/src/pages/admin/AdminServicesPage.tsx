import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash, Upload, Loader2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { serviceService, Service } from '@/services/serviceService';
import { uploadService } from '@/services/uploadService';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

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

    const globalSyncHandler = (data: any) => {
      if (!data) return;
      const entity = (data as any).entity;
      const action = (data as any).action;
      
      if (entity === 'service' && action) {
        fetchServices();
      }
    };

    socketService.on('global:sync', globalSyncHandler);

    return () => {
      socketService.leaveRoom('admin');
      socketService.off('global:sync', globalSyncHandler);
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
      toast.success(`Service ${!service.isQuickService ? 'added to' : 'removed from'} quick services`);
      fetchServices();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quick services</h1>
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
      </div>

      {loading ? (
        <p>Loading...</p>
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
                    <Label htmlFor={`quick-${service._id}`} className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Quick Service</Label>
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
    }
  };

  const handleFeatureChange = (index, value) => {
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
    // Clean up features: remove empty ones
    const cleanedData = {
      ...formData,
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
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Estimation Time</label>
                <input
                  type="text"
                  name="estimationTime"
                  value={formData.estimationTime}
                  onChange={handleChange}
                  placeholder="e.g. 2-3 hours"
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
                <Label htmlFor="isQuickService" className="font-semibold cursor-pointer">Show in Quick Services</Label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Service Image</label>
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
                      className="flex-1 p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
                  <label className="text-sm font-semibold">Features</label>
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
