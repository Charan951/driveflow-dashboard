import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Package, Upload, CheckCircle, FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { 
  getVehicleReference, 
  importVehicleReference,
  createVehicleReference,
  updateVehicleReference,
  deleteVehicleReference
} from '../../services/vehicleReferenceService';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VehicleData {
  _id: string;
  brand_name: string;
  model: string;
  brand_model: string;
  front_tyres: string;
  rear_tyres: string;
  battery_details?: string;
}

const AdminVehicleDataPage = () => {
  const [vehicleData, setVehicleData] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleData | null>(null);
  const [formData, setFormData] = useState({
    brand_name: '',
    model: '',
    brand_model: '',
    front_tyres: '',
    rear_tyres: '',
    battery_details: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVehicleData();
  }, []);

  const fetchVehicleData = async () => {
    try {
      setLoading(true);
      const data = await getVehicleReference();
      console.log('Vehicle data received:', data);
      if (Array.isArray(data)) {
        setVehicleData(data);
      } else {
        console.error('Vehicle data is not an array:', data);
        setVehicleData([]);
      }
    } catch (error) {
      toast.error('Failed to load vehicle data');
      setVehicleData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await importVehicleReference(file);
      toast.success('Vehicle data imported successfully');
      fetchVehicleData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import data');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenModal = (vehicle: VehicleData | null = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        brand_name: vehicle.brand_name,
        model: vehicle.model,
        brand_model: vehicle.brand_model,
        front_tyres: vehicle.front_tyres,
        rear_tyres: vehicle.rear_tyres,
        battery_details: vehicle.battery_details || ''
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        brand_name: '',
        model: '',
        brand_model: '',
        front_tyres: '',
        rear_tyres: '',
        battery_details: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await updateVehicleReference(editingVehicle._id, formData);
        toast.success('Vehicle data updated successfully');
      } else {
        await createVehicleReference(formData);
        toast.success('Vehicle data created successfully');
      }
      setIsModalOpen(false);
      fetchVehicleData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save vehicle data');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle reference?')) {
      try {
        await deleteVehicleReference(id);
        toast.success('Vehicle data deleted successfully');
        fetchVehicleData();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete vehicle data');
      }
    }
  };

  const filteredData = Array.isArray(vehicleData) ? vehicleData.filter(item => 
    item.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand_model?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const stats = {
    totalModels: Array.isArray(vehicleData) ? vehicleData.length : 0,
    brands: Array.isArray(vehicleData) ? new Set(vehicleData.map(v => v.brand_name)).size : 0,
  };

  if (loading && (!Array.isArray(vehicleData) || vehicleData.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Vehicle Reference Data</h1>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => handleOpenModal()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            Add New
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Upload size={18} />
            )}
            {uploading ? 'Importing...' : 'Import Excel'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Total Models</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{stats.totalModels}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Unique Brands</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{stats.brands}</h3>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by brand, model or brand_model..."
            className="w-full pl-10 pr-4 py-2 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Data View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Brand</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Model</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Brand Model</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Front Tyres</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Rear Tyres</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Battery</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {item.brand_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.model}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.brand_model}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {item.front_tyres}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {item.rear_tyres}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.battery_details || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No vehicle data found. Import an Excel file to get started.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Edit Vehicle Reference' : 'Add New Vehicle Reference'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand_name">Brand Name</Label>
                <Input
                  id="brand_name"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  placeholder="e.g. BMW"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g. 3 Series"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_model">Brand Model (Unique Identifier)</Label>
              <Input
                id="brand_model"
                value={formData.brand_model}
                onChange={(e) => setFormData({ ...formData, brand_model: e.target.value })}
                placeholder="e.g. 320d Luxury Edition"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="front_tyres">Front Tyres</Label>
                <Input
                  id="front_tyres"
                  value={formData.front_tyres}
                  onChange={(e) => setFormData({ ...formData, front_tyres: e.target.value })}
                  placeholder="e.g. 225 / 50 R17"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rear_tyres">Rear Tyres</Label>
                <Input
                  id="rear_tyres"
                  value={formData.rear_tyres}
                  onChange={(e) => setFormData({ ...formData, rear_tyres: e.target.value })}
                  placeholder="e.g. 225 / 50 R17"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="battery_details">Battery Details</Label>
              <Input
                id="battery_details"
                value={formData.battery_details}
                onChange={(e) => setFormData({ ...formData, battery_details: e.target.value })}
                placeholder="e.g. 80Ah AGM"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingVehicle ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVehicleDataPage;
