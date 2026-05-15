import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Package, Upload, CheckCircle, FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { 
  getVehicleReference, 
  importVehicleReference,
  createVehicleReference,
  updateVehicleReference,
  deleteVehicleReference,
  deleteAllVehicleReference
} from '../../services/vehicleReferenceService';
import { socketService } from '../../services/socket';
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
  pickup_drop_price?: string | number;
  tyre_price_bridgestone?: string | number;
  tyre_price_yokohama?: string | number;
  tyre_price_apollo?: string | number;
  tyre_price_michelin?: string | number;
  tyre_price_dummy2?: string | number;
  tyre_price_dummy?: string | number;
  battery_price_amaron?: string | number;
  battery_price_exide?: string | number;
  car_wash_price?: string | number;
  car_wash_exterior_price?: string | number;
  car_wash_interior_exterior_price?: string | number;
  car_wash_interior_exterior_underbody_price?: string | number;
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
    battery_details: '',
    pickup_drop_price: '',
    tyre_price_bridgestone: '',
    tyre_price_yokohama: '',
    tyre_price_apollo: '',
    tyre_price_michelin: '',
    tyre_price_dummy2: '',
    tyre_price_dummy: '',
    battery_price_amaron: '',
    battery_price_exide: '',
    car_wash_price: '',
    car_wash_exterior_price: '',
    car_wash_interior_exterior_price: '',
    car_wash_interior_exterior_underbody_price: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVehicleData();

    // Socket Setup
    socketService.connect();
    socketService.joinRoom('admin');

    const globalSyncHandler = (data: any) => {
      if (!data) return;
      const entity = (data as any).entity;
      const action = (data as any).action;
      
      // 'vehicle_reference' or 'vehicle' entity change should refresh this
      if ((entity === 'vehicle' || entity === 'vehicle_reference') && action) {
        fetchVehicleData();
      }
    };

    socketService.on('global:sync', globalSyncHandler);

    return () => {
      socketService.leaveRoom('admin');
      socketService.off('global:sync', globalSyncHandler);
    };
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
        battery_details: vehicle.battery_details || '',
        pickup_drop_price: vehicle.pickup_drop_price?.toString() || '',
        tyre_price_bridgestone: vehicle.tyre_price_bridgestone?.toString() || '',
        tyre_price_yokohama: vehicle.tyre_price_yokohama?.toString() || '',
        tyre_price_apollo: vehicle.tyre_price_apollo?.toString() || '',
        tyre_price_michelin: vehicle.tyre_price_michelin?.toString() || '',
        tyre_price_dummy2: vehicle.tyre_price_dummy2?.toString() || '',
        tyre_price_dummy: vehicle.tyre_price_dummy?.toString() || '',
        battery_price_amaron: vehicle.battery_price_amaron?.toString() || '',
        battery_price_exide: vehicle.battery_price_exide?.toString() || '',
        car_wash_price: vehicle.car_wash_price?.toString() || '',
        car_wash_exterior_price: vehicle.car_wash_exterior_price?.toString() || '',
        car_wash_interior_exterior_price: vehicle.car_wash_interior_exterior_price?.toString() || '',
        car_wash_interior_exterior_underbody_price: vehicle.car_wash_interior_exterior_underbody_price?.toString() || ''
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        brand_name: '',
        model: '',
        brand_model: '',
        front_tyres: '',
        rear_tyres: '',
        battery_details: '',
        pickup_drop_price: '',
        tyre_price_bridgestone: '',
        tyre_price_yokohama: '',
        tyre_price_apollo: '',
        tyre_price_michelin: '',
        tyre_price_dummy2: '',
        tyre_price_dummy: '',
        battery_price_amaron: '',
        battery_price_exide: '',
        car_wash_price: '',
        car_wash_exterior_price: '',
        car_wash_interior_exterior_price: '',
        car_wash_interior_exterior_underbody_price: ''
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

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL vehicle reference data? This action cannot be undone.')) {
      try {
        setLoading(true);
        await deleteAllVehicleReference();
        toast.success('All vehicle data deleted successfully');
        fetchVehicleData();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete all vehicle data');
      } finally {
        setLoading(false);
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
            onClick={handleDeleteAll}
            disabled={loading || vehicleData.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
            Delete All
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
                <th className="px-6 py-4 font-semibold text-gray-700">Variant</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Tyre Size</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Bridgestone</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Yokohama</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Apollo</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Michelin</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Dummy 2</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Dummy</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Amaron</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Exide</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Wash (Ext)</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Wash (Int+Ext)</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Wash (Full)</th>
                <th className="px-6 py-4 font-semibold text-gray-700">P/D Price</th>
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
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-400 uppercase">Front:</span>
                      <span>{item.front_tyres}</span>
                      <span className="text-[10px] text-gray-400 uppercase">Rear:</span>
                      <span>{item.rear_tyres}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.tyre_price_bridgestone ? `₹${item.tyre_price_bridgestone}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.tyre_price_yokohama ? `₹${item.tyre_price_yokohama}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.tyre_price_apollo ? `₹${item.tyre_price_apollo}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                      {item.tyre_price_michelin ? `₹${item.tyre_price_michelin}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.tyre_price_dummy2 ? `₹${item.tyre_price_dummy2}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.tyre_price_dummy ? `₹${item.tyre_price_dummy}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.battery_price_amaron ? `₹${item.battery_price_amaron}` : '-'}
                    </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.battery_price_exide ? `₹${item.battery_price_exide}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.car_wash_exterior_price ? `₹${item.car_wash_exterior_price}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.car_wash_interior_exterior_price ? `₹${item.car_wash_interior_exterior_price}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.car_wash_interior_exterior_underbody_price ? `₹${item.car_wash_interior_exterior_underbody_price}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.pickup_drop_price ? `₹${item.pickup_drop_price}` : '-'}
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
          <form onSubmit={handleSave} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
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

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-700">Tyre Prices</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tyre_price_bridgestone">Bridgestone</Label>
                  <Input
                    id="tyre_price_bridgestone"
                    type="number"
                    value={formData.tyre_price_bridgestone}
                    onChange={(e) => setFormData({ ...formData, tyre_price_bridgestone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tyre_price_yokohama">Yokohama</Label>
                  <Input
                    id="tyre_price_yokohama"
                    type="number"
                    value={formData.tyre_price_yokohama}
                    onChange={(e) => setFormData({ ...formData, tyre_price_yokohama: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tyre_price_apollo">Apollo</Label>
                  <Input
                    id="tyre_price_apollo"
                    type="number"
                    value={formData.tyre_price_apollo}
                    onChange={(e) => setFormData({ ...formData, tyre_price_apollo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tyre_price_michelin">Michelin</Label>
                  <Input
                    id="tyre_price_michelin"
                    type="number"
                    value={formData.tyre_price_michelin}
                    onChange={(e) => setFormData({ ...formData, tyre_price_michelin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tyre_price_dummy">Tyre Price - Dummy</Label>
                  <Input
                    id="tyre_price_dummy"
                    type="number"
                    value={formData.tyre_price_dummy}
                    onChange={(e) => setFormData({ ...formData, tyre_price_dummy: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tyre_price_dummy2">Tyre Price - Dummy 2</Label>
                  <Input
                    id="tyre_price_dummy2"
                    type="number"
                    value={formData.tyre_price_dummy2}
                    onChange={(e) => setFormData({ ...formData, tyre_price_dummy2: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-700">Battery & Others</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="battery_price_amaron">Amaron</Label>
                  <Input
                    id="battery_price_amaron"
                    type="number"
                    value={formData.battery_price_amaron}
                    onChange={(e) => setFormData({ ...formData, battery_price_amaron: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="battery_price_exide">Exide</Label>
                  <Input
                    id="battery_price_exide"
                    type="number"
                    value={formData.battery_price_exide}
                    onChange={(e) => setFormData({ ...formData, battery_price_exide: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="car_wash_exterior_price">Car wash-Exterior wash</Label>
                  <Input
                    id="car_wash_exterior_price"
                    type="number"
                    value={formData.car_wash_exterior_price}
                    onChange={(e) => setFormData({ ...formData, car_wash_exterior_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="car_wash_interior_exterior_price">Car wash-Interior + Exterior</Label>
                  <Input
                    id="car_wash_interior_exterior_price"
                    type="number"
                    value={formData.car_wash_interior_exterior_price}
                    onChange={(e) => setFormData({ ...formData, car_wash_interior_exterior_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="car_wash_interior_exterior_underbody_price">Car Wash-Int + Ext + Underbody</Label>
                  <Input
                    id="car_wash_interior_exterior_underbody_price"
                    type="number"
                    value={formData.car_wash_interior_exterior_underbody_price}
                    onChange={(e) => setFormData({ ...formData, car_wash_interior_exterior_underbody_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_drop_price">Pickup/Drop Price</Label>
                  <Input
                    id="pickup_drop_price"
                    type="number"
                    value={formData.pickup_drop_price}
                    onChange={(e) => setFormData({ ...formData, pickup_drop_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2 hidden">
                  <Label htmlFor="car_wash_price">Car Wash Price (Legacy)</Label>
                  <Input
                    id="car_wash_price"
                    type="number"
                    value={formData.car_wash_price}
                    onChange={(e) => setFormData({ ...formData, car_wash_price: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="battery_details">General Battery Details</Label>
              <Input
                id="battery_details"
                value={formData.battery_details}
                onChange={(e) => setFormData({ ...formData, battery_details: e.target.value })}
                placeholder="e.g. 80Ah AGM"
              />
            </div>

            <DialogFooter className="pt-4 sticky bottom-0 bg-white">
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
