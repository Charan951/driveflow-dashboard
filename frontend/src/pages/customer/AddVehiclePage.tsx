import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Car, Upload, ChevronRight } from 'lucide-react';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import VehicleCard from '@/components/VehicleCard';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';

const AddVehiclePage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [formData, setFormData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    variant: '',
    fuel: '',
    year: '',
    color: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoadingVehicles(true);
      const data = await vehicleService.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      toast.error('Failed to load your vehicles');
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const handleRegNoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Try to fetch vehicle details
      const details = await vehicleService.fetchVehicleDetails(formData.licensePlate);
      
      if (details) {
        setFormData(prev => ({
          ...prev,
          make: details.make || '',
          model: details.model || '',
          variant: details.variant || '',
          fuel: details.fuelType || '',
          year: details.year?.toString() || '',
          color: details.color || ''
        }));
        toast.success('Vehicle details found!');
      } else {
        toast.info('Vehicle details not found. Please enter manually.');
      }
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      // Don't block the user, just let them enter manually
      toast.info('Could not auto-fetch details. Please enter manually.');
    } finally {
      setIsLoading(false);
      setStep(2);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await vehicleService.addVehicle({
        ...formData,
        year: parseInt(formData.year) || new Date().getFullYear(),
        // Map other fields as necessary to match Vehicle interface
      });
      
      toast.success('Vehicle added successfully!');
      setShowForm(false);
      setStep(1);
      setFormData({ licensePlate: '', make: '', model: '', variant: '', fuel: '', year: '', color: '' });
      fetchVehicles(); // Refresh list
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      toast.error('Failed to add vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this vehicle?')) return;
    
    try {
      await vehicleService.deleteVehicle(id);
      toast.success('Vehicle removed successfully');
      fetchVehicles();
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      toast.error('Failed to remove vehicle');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Vehicles</h1>
          <p className="text-muted-foreground">Manage your registered vehicles</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setStep(1); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Add Vehicle Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <h2 className="text-lg font-semibold mb-6">Add New Vehicle</h2>
          
          {step === 1 ? (
            <form onSubmit={handleRegNoSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Vehicle Registration Number</label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    name="licensePlate"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})}
                    placeholder="e.g. MH 02 AB 1234"
                    required
                    className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
                  />
                  <button
                    type="submit"
                    disabled={!formData.licensePlate || isLoading}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Fetching...' : 'Next'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Make</label>
                  <input
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Model</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Variant</label>
                  <input
                    type="text"
                    name="variant"
                    value={formData.variant}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Fuel Type</label>
                  <input
                    type="text"
                    name="fuel"
                    value={formData.fuel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Year</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Color</label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Confirm Vehicle'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      )}

      {/* Vehicle List */}
      {isLoadingVehicles ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[200px] bg-muted/20 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {vehicles.map((vehicle) => (
            <motion.div key={vehicle._id} variants={staggerItem}>
              <VehicleCard
                id={vehicle._id}
                make={vehicle.make}
                model={vehicle.model}
                year={vehicle.year}
                licensePlate={vehicle.licensePlate}
                image={vehicle.image}
                nextService={vehicle.nextService}
                status={vehicle.status}
                onDelete={() => handleDeleteVehicle(vehicle._id)}
                onClick={() => {}}
              />
            </motion.div>
          ))}
          <motion.div variants={staggerItem}>
            <button
              onClick={() => setShowForm(true)}
              className="w-full h-full min-h-[230px] flex flex-col items-center justify-center bg-muted/50 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">Add Vehicle</p>
              <p className="text-sm text-muted-foreground">Register a new vehicle</p>
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AddVehiclePage;