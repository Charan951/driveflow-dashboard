import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash, X, Save, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceService, Service } from '@/services/serviceService';
import { uploadService } from '@/services/uploadService';
import { toast } from 'sonner';
import api from '@/services/api';

const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    description: '',
    price: 0,
    duration: 60,
    category: 'Periodic',
    vehicleType: 'Car',
    features: [],
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await serviceService.getServices();
      setServices(data);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await serviceService.deleteService(id);
        setServices(services.filter(s => s._id !== id));
        toast.success('Service deleted');
      } catch (error) {
        toast.error('Failed to delete service');
      }
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData(service);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      duration: 60,
      category: 'Periodic',
      vehicleType: 'Car',
      features: [],
    });
    setIsModalOpen(true);
  };

  const handleImageUpload: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadService.uploadFile(file);
      const url: string = res?.url;
      if (url) {
        setFormData((prev) => ({ ...prev, image: url }));
        toast.success('Image uploaded');
      } else {
        toast.error('Upload succeeded but no URL returned');
      }
    } catch (err) {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
      // Reset input value so the same file can be reselected if needed
      e.currentTarget.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        const updated = await serviceService.updateService(editingService._id, formData);
        setServices(services.map(s => s._id === editingService._id ? updated : s));
        toast.success('Service updated');
      } else {
        const created = await serviceService.createService(formData as Service);
        setServices([...services, created]);
        toast.success('Service created');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to save service');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Services</h1>
        <button 
          onClick={handleAddNew}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <div key={service._id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  {service.image ? (
                    <img src={service.image} alt={service.name} className="w-full h-32 object-cover rounded-md mb-2" />
                  ) : null}
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-xs text-muted-foreground">{service.category} • {service.vehicleType}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(service)} className="p-1 hover:bg-muted rounded"><Edit className="w-4 h-4 text-blue-500" /></button>
                  <button onClick={() => handleDelete(service._id)} className="p-1 hover:bg-muted rounded"><Trash className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
              <div className="flex justify-between items-center mt-auto">
                <span className="font-bold text-primary">₹{service.price}</span>
                <span className="text-xs bg-muted px-2 py-1 rounded">{service.duration} mins</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{editingService ? 'Edit Service' : 'New Service'}</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Service Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full mt-1 p-2 border rounded-lg bg-muted/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as Service['category']})}
                      className="w-full mt-1 p-2 border rounded-lg bg-muted/50"
                    >
                      {['Periodic', 'Repair', 'Wash', 'Tyres', 'Denting', 'Painting', 'Detailing', 'AC', 'Accessories', 'Other'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Type</label>
                    <select 
                      value={formData.vehicleType}
                      disabled
                      className="w-full mt-1 p-2 border rounded-lg bg-muted/20 cursor-not-allowed"
                    >
                      <option value="Car">Car</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Price (₹)</label>
                    <input 
                      type="number"
                      min={0}
                      required 
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                      className="w-full mt-1 p-2 border rounded-lg bg-muted/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duration (mins)</label>
                    <input 
                      type="number" 
                      min={1}
                      required 
                      placeholder="e.g. 120"
                      value={formData.duration}
                      onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                      className="w-full mt-1 p-2 border rounded-lg bg-muted/50"
                    />
                  </div>
                </div>

              {/* Image upload */}
              <div>
                <label className="text-sm font-medium">Image</label>
                {formData.image ? (
                  <div className="mt-2">
                    <img src={formData.image} alt="Service" className="w-full h-40 object-cover rounded-lg border border-border/50" />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground truncate">{formData.image}</span>
                      <button type="button" onClick={() => setFormData({ ...formData, image: undefined })} className="text-xs text-red-500 hover:underline">Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80"
                    />
                    {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
                  </div>
                )}
              </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full mt-1 p-2 border rounded-lg bg-muted/50 resize-none"
                  />
                </div>

                <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold">
                  {editingService ? 'Update Service' : 'Create Service'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminServicesPage;
