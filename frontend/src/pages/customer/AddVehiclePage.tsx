import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Car, Upload, ChevronRight } from 'lucide-react';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import VehicleCard from '@/components/VehicleCard';
import VehicleDetailModal from '@/components/VehicleDetailModal';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';
import { searchVehicleReference } from '@/services/vehicleReferenceService';

const AddVehiclePage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [isFetchingTires, setIsFetchingTires] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<Vehicle | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    variant: '',
    fuel: '',
    year: '',
    registrationDate: '',
    color: '',
    frontTyres: '',
    rearTyres: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    const fetchTireDetails = async () => {
      if (formData.make && formData.model && formData.variant && formData.variant.trim() !== '') {
        setIsFetchingTires(true);
        try {
          const details = await searchVehicleReference(formData.make, formData.model, formData.variant);
          if (details) {
            setFormData(prev => ({
              ...prev,
              frontTyres: details.front_tyres || prev.frontTyres,
              rearTyres: details.rear_tyres || prev.rearTyres,
            }));
          }
        } catch (error) {
          console.error('Failed to fetch tire details:', error);
        } finally {
          setIsFetchingTires(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchTireDetails();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [formData.make, formData.model, formData.variant]);

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
      const details = await vehicleService.getVehicleRCDetails(formData.licensePlate);

      if (details && details.found) {
        // Extract year from registration_date (assuming DD-MM-YYYY or YYYY-MM-DD)
        let extractedYear = '';
        if (details.registration_date) {
          const dateParts = details.registration_date.split(/[-/]/);
          if (dateParts.length === 3) {
            // Check if year is first or last
            if (dateParts[0].length === 4) extractedYear = dateParts[0];
            else if (dateParts[2].length === 4) extractedYear = dateParts[2];
          }
        }

        setFormData((prev) => ({
          ...prev,
          make: details.brand_name || '',
          model: details.brand_model || '',
          variant: details.variant || '',
          fuel: details.fuel_type || '',
          year: extractedYear || new Date().getFullYear().toString(),
          registrationDate: details.registration_date || '',
          color: details.color || '',
        }));
        toast.success('Vehicle details found!');
      } else {
        const message =
          (details && (details.message as string)) ||
          'Vehicle details not found. Please enter manually.';
        toast.info(message);
      }
    } catch (error: any) {
      console.error('Error fetching vehicle details:', error);
      const message = error.response?.data?.message || 'Could not auto-fetch details. Please enter manually.';
      toast.info(message);
    } finally {
      setIsLoading(false);
      setStep(2);
    }
  };

  const handleManualEntry = () => {
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await vehicleService.addVehicle({ 
        licensePlate: formData.licensePlate,
        make: formData.make.trim(),
        model: formData.model.trim(),
        variant: formData.variant.trim(),
        year: parseInt(formData.year) || new Date().getFullYear(),
        registrationDate: formData.registrationDate.trim() || undefined,
        color: formData.color.trim() || undefined,
        fuelType: formData.fuel.trim() || undefined,
        frontTyres: formData.frontTyres,
        rearTyres: formData.rearTyres,
      });
      
      toast.success('Vehicle added successfully!');
      setShowForm(false);
      setStep(1);
      setFormData({ licensePlate: '', make: '', model: '', variant: '', fuel: '', year: '', registrationDate: '', color: '', frontTyres: '', rearTyres: '' });
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
    <div className="w-full h-full py-4 lg:py-6 space-y-4 sm:space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Vehicles</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your registered vehicles</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setStep(1); }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto"
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
          className="bg-card rounded-2xl border border-border p-4 sm:p-6"
        >
          <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Add New Vehicle</h2>
          
          {step === 1 ? (
            <form onSubmit={handleRegNoSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Vehicle Registration Number</label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <input
                    type="text"
                    name="licensePlate"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})}
                    placeholder="e.g. MH 02 AB 1234"
                    required
                    className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
                  />
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={!formData.licensePlate || isLoading}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Fetching...' : 'Next'}
                    </button>
                    <button
                      type="button"
                      onClick={handleManualEntry}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-muted/80 transition-colors"
                    >
                      Manual
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Brand</label>
                  <input
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    required
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
                    required
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
                  <label className="block text-sm font-medium text-foreground mb-2">Registration Date</label>
                  <input
                    type="text"
                    name="registrationDate"
                    value={formData.registrationDate}
                    onChange={handleChange}
                    placeholder="DD-MM-YYYY"
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
                    required
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

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
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
          className="space-y-4"
        >
          {vehicles.map((vehicle) => (
            <motion.div key={vehicle._id} variants={staggerItem} className="w-full">
              <VehicleCard
                id={vehicle._id}
                make={vehicle.make}
                model={vehicle.model}
                year={vehicle.year}
                licensePlate={vehicle.licensePlate}
                variant={vehicle.variant}
                image={vehicle.image}
                nextService={vehicle.nextService}
                status={vehicle.status}
                onDelete={() => handleDeleteVehicle(vehicle._id)}
                onClick={() => navigate(`/vehicles/${vehicle._id}`)}
              />
            </motion.div>
          ))}
          <motion.div variants={staggerItem} className="w-full">
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex flex-col items-center justify-center p-6 bg-muted/50 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <p className="font-medium text-foreground text-sm sm:text-base">Add Vehicle</p>
              <p className="text-xs sm:text-sm text-muted-foreground text-center px-4">Register a new vehicle</p>
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        vehicle={selectedVehicleForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedVehicleForDetail(null);
        }}
      />
    </div>
  );
};

export default AddVehiclePage;
