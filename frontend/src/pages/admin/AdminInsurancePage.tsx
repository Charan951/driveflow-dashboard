import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Shield, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { vehicleService, Vehicle } from '../../services/vehicleService';
import { toast } from 'react-hot-toast';

const AdminInsurancePage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInsuranceData();
  }, []);

  const fetchInsuranceData = async () => {
    try {
      const data = await vehicleService.getInsuranceData();
      setVehicles(data);
    } catch (error) {
      toast.error('Failed to load insurance data');
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const insurance = vehicle.insurance;
    if (!insurance) return false;
    const matchesStatus = filterStatus === 'All' || insurance.status === filterStatus;
    const matchesSearch = 
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof vehicle.user === 'object' && vehicle.user?.name ? vehicle.user.name : '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (insurance.policyNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    active: vehicles.filter(v => v.insurance?.status === 'Active').length,
    expiringSoon: vehicles.filter(v => v.insurance?.status === 'Expiring Soon').length,
    expired: vehicles.filter(v => v.insurance?.status === 'Expired').length,
  };

  const handleTriggerRenewal = (vehicleId: string) => {
    toast.success('Renewal notification sent to customer');
    // Implement actual logic here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Insurance Management</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Active Policies</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{stats.active}</h3>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle size={20} className="md:w-6 md:h-6" />
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
              <p className="text-xs md:text-sm text-gray-500">Expiring Soon</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{stats.expiringSoon}</h3>
            </div>
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
              <AlertTriangle size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Expired Policies</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{stats.expired}</h3>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Shield size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by vehicle, owner, or policy #"
            className="w-full pl-10 pr-4 py-2 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <Filter size={18} className="text-gray-400 shrink-0" />
          <select
            className="border border-gray-200 rounded-lg px-3 md:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Insurance View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile View: Card Layout */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredVehicles.map((vehicle) => (
            <div key={vehicle._id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-800 text-sm">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-mono">{vehicle.licensePlate}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium
                  ${vehicle.insurance?.status === 'Active' ? 'bg-green-100 text-green-800' :
                    vehicle.insurance?.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'}`}
                >
                  {vehicle.insurance?.status || 'Unknown'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-2 rounded-lg">
                <div>
                  <p className="text-gray-400">Policy #</p>
                  <p className="font-medium text-gray-700 truncate">{vehicle.insurance?.policyNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Provider</p>
                  <p className="font-medium text-gray-700 truncate">{vehicle.insurance?.provider || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Expiry</p>
                  <p className="font-medium text-gray-700">
                    {vehicle.insurance?.expiryDate ? new Date(vehicle.insurance.expiryDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="flex items-end justify-end">
                  <button
                    onClick={() => handleTriggerRenewal(vehicle._id)}
                    className="text-blue-600 hover:text-blue-800 text-[10px] font-medium flex items-center gap-1 px-2 py-1 bg-white rounded border border-blue-100 shadow-sm"
                  >
                    <Bell size={12} />
                    <span>Notify</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Vehicle</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Policy Number</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Provider</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Expiry Date</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">
                      {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-xs text-gray-500">{vehicle.licensePlate}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {vehicle.insurance?.policyNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {vehicle.insurance?.provider || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {vehicle.insurance?.expiryDate ? new Date(vehicle.insurance.expiryDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium
                      ${vehicle.insurance?.status === 'Active' ? 'bg-green-100 text-green-800' :
                        vehicle.insurance?.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}`}
                    >
                      {vehicle.insurance?.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleTriggerRenewal(vehicle._id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                    >
                      <Bell size={16} />
                      <span>Notify</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredVehicles.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No insurance records found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInsurancePage;
