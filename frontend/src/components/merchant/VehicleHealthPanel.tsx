import React, { useState } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { vehicleService, Vehicle } from '../../services/vehicleService';
import { Booking } from '../../services/bookingService';

interface VehicleHealthPanelProps {
  booking: Booking;
  onUpdate: () => void;
}

const VehicleHealthPanel: React.FC<VehicleHealthPanelProps> = ({ booking, onUpdate }) => {
  const vehicle = booking.vehicle as unknown as Vehicle;
  const [loading, setLoading] = useState(false);

  const [health, setHealth] = useState({
    generalService: {
        value: vehicle?.healthIndicators?.generalService?.value ?? 0,
        fixedKm: vehicle?.healthIndicators?.generalService?.fixedKm ?? 0,
        fixedDays: vehicle?.healthIndicators?.generalService?.fixedDays ?? 0
    },
    brakePads: {
        value: vehicle?.healthIndicators?.brakePads?.value ?? 0,
        fixedKm: vehicle?.healthIndicators?.brakePads?.fixedKm ?? 0,
        fixedDays: vehicle?.healthIndicators?.brakePads?.fixedDays ?? 0
    },
    tires: {
        value: vehicle?.healthIndicators?.tires?.value ?? 0,
        fixedKm: vehicle?.healthIndicators?.tires?.fixedKm ?? 0,
        fixedDays: vehicle?.healthIndicators?.tires?.fixedDays ?? 0
    },
    battery: {
        value: vehicle?.healthIndicators?.battery?.value ?? 0,
        fixedKm: vehicle?.healthIndicators?.battery?.fixedKm ?? 0,
        fixedDays: vehicle?.healthIndicators?.battery?.fixedDays ?? 0
    },
    wiperBlade: {
        value: vehicle?.healthIndicators?.wiperBlade?.value ?? 0,
        fixedKm: vehicle?.healthIndicators?.wiperBlade?.fixedKm ?? 0,
        fixedDays: vehicle?.healthIndicators?.wiperBlade?.fixedDays ?? 0
    },
  });

  const handleSliderChange = (key: keyof typeof health, value: number[]) => {
    setHealth(prev => ({
      ...prev,
      [key]: { ...prev[key], value: value[0] }
    }));
  };

  const handleKmChange = (key: keyof typeof health, km: string) => {
    const value = parseInt(km) || 0;
    setHealth(prev => ({
        ...prev,
        [key]: { ...prev[key], fixedKm: value }
    }));
  };

  const handleDaysChange = (key: keyof typeof health, days: string) => {
    const value = parseInt(days) || 0;
    setHealth(prev => ({
        ...prev,
        [key]: { ...prev[key], fixedDays: value }
    }));
  };

  const handleSaveHealth = async () => {
    if (!vehicle?._id) {
        toast.error('Vehicle ID not found');
        return;
    }

    setLoading(true);
    try {
      await vehicleService.updateVehicleHealth(vehicle._id, health);
      toast.success('Vehicle health indicators updated successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update vehicle health');
    } finally {
      setLoading(false);
    }
  };

  const indicators = [
    { key: 'generalService', label: 'General Service (Oil & Filter)', icon: '🛢️' },
    { key: 'brakePads', label: 'Brake Pads', icon: '🛑' },
    { key: 'tires', label: 'Tire Condition', icon: '🛞' },
    { key: 'battery', label: 'Battery Health', icon: '🔋' },
    { key: 'wiperBlade', label: 'Wiper Blade', icon: '🧹' },
  ] as const;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Vehicle Health Indicators
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-blue-50 px-2 py-1 rounded-full">
            <Info className="w-3 h-3" />
            Merchant Update Only
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 py-4">
        {indicators.map((indicator) => (
            <div key={indicator.key} className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{indicator.icon}</span>
                        <div className="flex flex-col">
                            <span className="font-medium text-sm">{indicator.label}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground">Fixed KM:</span>
                                <input 
                                    type="number"
                                    value={health[indicator.key].fixedKm}
                                    onChange={(e) => handleKmChange(indicator.key, e.target.value)}
                                    className="w-20 h-5 text-[10px] border rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Enter KM"
                                />
                                <span className="text-[10px] text-muted-foreground ml-2">Fixed Days:</span>
                                <input 
                                    type="number"
                                    value={health[indicator.key].fixedDays}
                                    onChange={(e) => handleDaysChange(indicator.key, e.target.value)}
                                    className="w-16 h-5 text-[10px] border rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Days"
                                />
                            </div>
                        </div>
                    </div>
                    <span className={`text-sm font-bold ${health[indicator.key].value > 80 ? 'text-red-500' : health[indicator.key].value > 50 ? 'text-orange-500' : 'text-green-600'}`}>
                        {health[indicator.key].value}%
                    </span>
                </div>
                <Slider
                    value={[health[indicator.key].value]}
                    onValueChange={(val) => handleSliderChange(indicator.key, val)}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground italic flex justify-between items-center">
                    <span>
                      Last updated: {vehicle?.healthIndicators?.[indicator.key as keyof typeof vehicle.healthIndicators]?.lastUpdated ? new Date(vehicle.healthIndicators[indicator.key as keyof typeof vehicle.healthIndicators]!.lastUpdated).toLocaleDateString() : 'Never'}
                    </span>
                    <div className="flex gap-4">
                      <span>
                        Fixed KM: {health[indicator.key].fixedKm}
                      </span>
                      <span>
                        Fixed Days: {health[indicator.key].fixedDays}
                      </span>
                    </div>
                </p>
            </div>
        ))}
      </div>

      <div className="pt-4 border-t flex justify-end">
        <button
            onClick={handleSaveHealth}
            disabled={loading}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
            {loading ? 'Updating...' : 'Save Health Stats'}
        </button>
      </div>
    </div>
  );
};

export default VehicleHealthPanel;
