import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { vehicleService, Vehicle } from '../../services/vehicleService';
import { Booking } from '../../services/bookingService';
import { calculateHealthDisplayPercent, dailyDecayPercentFromBaseline } from '@/lib/vehicleHealthRemaining';

interface VehicleHealthPanelProps {
  booking: Booking;
  onUpdate: () => void;
  /** When set, called after successful "Save health" instead of onUpdate (use for refetch + tab change). */
  onHealthStatsSaved?: () => void | Promise<void>;
}

const VehicleHealthPanel: React.FC<VehicleHealthPanelProps> = ({ booking, onUpdate, onHealthStatsSaved }) => {
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

  useEffect(() => {
    if (vehicle?.healthIndicators) {
      setHealth({
        generalService: {
            value: vehicle.healthIndicators.generalService?.value ?? 0,
            fixedKm: vehicle.healthIndicators.generalService?.fixedKm ?? 0,
            fixedDays: vehicle.healthIndicators.generalService?.fixedDays ?? 0
        },
        brakePads: {
            value: vehicle.healthIndicators.brakePads?.value ?? 0,
            fixedKm: vehicle.healthIndicators.brakePads?.fixedKm ?? 0,
            fixedDays: vehicle.healthIndicators.brakePads?.fixedDays ?? 0
        },
        tires: {
            value: vehicle.healthIndicators.tires?.value ?? 0,
            fixedKm: vehicle.healthIndicators.tires?.fixedKm ?? 0,
            fixedDays: vehicle.healthIndicators.tires?.fixedDays ?? 0
        },
        battery: {
            value: vehicle.healthIndicators.battery?.value ?? 0,
            fixedKm: vehicle.healthIndicators.battery?.fixedKm ?? 0,
            fixedDays: vehicle.healthIndicators.battery?.fixedDays ?? 0
        },
        wiperBlade: {
            value: vehicle.healthIndicators.wiperBlade?.value ?? 0,
            fixedKm: vehicle.healthIndicators.wiperBlade?.fixedKm ?? 0,
            fixedDays: vehicle.healthIndicators.wiperBlade?.fixedDays ?? 0
        },
      });
    }
  }, [vehicle]);

  const displayHealth = useMemo(() => {
    const currentKm = vehicle?.mileage || 0;
    const baselineAt = vehicle?.healthPercentBaselineAt;
    const serverPct =
      vehicle?.healthPercentDisplay != null && !Number.isNaN(Number(vehicle.healthPercentDisplay))
        ? Math.max(0, Math.min(100, Math.round(Number(vehicle.healthPercentDisplay))))
        : null;
    const baselinePct =
      serverPct != null ? serverPct : baselineAt ? dailyDecayPercentFromBaseline(baselineAt) : null;

    const row = (key: keyof typeof health) =>
      baselinePct != null
        ? baselinePct
        : calculateHealthDisplayPercent(
            {
              ...health[key],
              lastServiceDate: vehicle?.healthIndicators?.[key]?.lastServiceDate,
              lastServiceKm: vehicle?.healthIndicators?.[key]?.lastServiceKm,
            },
            currentKm,
            baselineAt
          );

    return {
      generalService: row('generalService'),
      brakePads: row('brakePads'),
      tires: row('tires'),
      battery: row('battery'),
      wiperBlade: row('wiperBlade'),
    };
  }, [health, vehicle]);

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

  const handleResetHealth = async () => {
    if (!vehicle?._id) {
        toast.error('Vehicle ID not found');
        return;
    }

    setLoading(true);
    try {
      await vehicleService.updateVehicleHealth(vehicle._id, { resetAll: true });
      const resetHealth = {
        generalService: { value: 0, fixedKm: 0, fixedDays: 0 },
        brakePads: { value: 0, fixedKm: 0, fixedDays: 0 },
        tires: { value: 0, fixedKm: 0, fixedDays: 0 },
        battery: { value: 0, fixedKm: 0, fixedDays: 0 },
        wiperBlade: { value: 0, fixedKm: 0, fixedDays: 0 },
      };
      setHealth(resetHealth);
      toast.success('All vehicle health indicators reset successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to reset vehicle health');
    } finally {
      setLoading(false);
    }
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
      if (onHealthStatsSaved) {
        await onHealthStatsSaved();
      } else {
        onUpdate();
      }
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
        {indicators.map((indicator) => {
            const row = health[indicator.key];
            const baselineAt = vehicle?.healthPercentBaselineAt;
            const hasInterval = row.fixedKm > 0 || row.fixedDays > 0;
            const useAutoPercent = !!baselineAt || hasInterval;
            const remaining = displayHealth[indicator.key];
            const pctClass = useAutoPercent
              ? remaining <= 20
                ? 'text-red-500'
                : remaining <= 50
                  ? 'text-orange-500'
                  : 'text-green-600'
              : remaining > 80
                ? 'text-red-500'
                : remaining > 50
                  ? 'text-orange-500'
                  : 'text-green-600';

            return (
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
                    <span className={`text-sm font-bold ${pctClass}`}>
                        {remaining}%
                    </span>
                </div>
                <Slider
                    value={[useAutoPercent ? remaining : health[indicator.key].value]}
                    onValueChange={(val) => {
                      if (!useAutoPercent) handleSliderChange(indicator.key, val);
                    }}
                    max={100}
                    step={1}
                    disabled={useAutoPercent}
                    title={
                      baselineAt
                        ? 'All indicators: 100% on last health save, then −1% per calendar day'
                        : hasInterval
                          ? 'Remaining life from Fixed KM / Fixed Days vs last service date and mileage'
                          : 'Manual wear % (set Fixed KM or Fixed Days for automatic remaining life)'
                    }
                    className={useAutoPercent ? 'cursor-default opacity-95' : 'cursor-pointer'}
                />
                <p className="text-[10px] text-muted-foreground italic flex justify-between items-center">
                    <span>
                      Last updated: {vehicle?.healthIndicators?.[indicator.key as keyof typeof vehicle.healthIndicators]?.lastServiceDate ? new Date(vehicle.healthIndicators[indicator.key as keyof typeof vehicle.healthIndicators]!.lastServiceDate).toLocaleDateString() : 'Never'}
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
            );
        })}
      </div>

      <div className="pt-4 border-t flex justify-between items-center">
        <button
            onClick={handleResetHealth}
            disabled={loading}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
            Reset All
        </button>
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
