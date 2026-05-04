import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

interface HealthIndicator {
  key: string;
  label: string;
  icon: string;
  value: number;
  lifespanDays: number;
  fixedKm?: number;
  fixedDays?: number;
}

interface VehicleHealthIndicatorsProps {
  mileage?: number;
  healthIndicators?: {
    generalService?: { value: number; lastUpdated: string; fixedKm?: number; fixedDays?: number; lastServiceKm?: number };
    brakePads?: { value: number; lastUpdated: string; fixedKm?: number; fixedDays?: number; lastServiceKm?: number };
    tires?: { value: number; lastUpdated: string; fixedKm?: number; fixedDays?: number; lastServiceKm?: number };
    battery?: { value: number; lastUpdated: string; fixedKm?: number; fixedDays?: number; lastServiceKm?: number };
    wiperBlade?: { value: number; lastUpdated: string; fixedKm?: number; fixedDays?: number; lastServiceKm?: number };
  };
}

const VehicleHealthIndicators: React.FC<VehicleHealthIndicatorsProps> = ({ healthIndicators, mileage }) => {
  if (!healthIndicators) return null;

  const calculateCurrentValue = (indicator: any) => {
    if (!indicator) return 0;
    // Static calculation - return exactly what the merchant saved
    return Math.min(100, Math.round(indicator.value || 0));
  };

  const indicators: HealthIndicator[] = [
    { 
      key: 'generalService', 
      label: 'Engine Oil / Service', 
      icon: '🛢️', 
      value: calculateCurrentValue(healthIndicators.generalService),
      fixedKm: healthIndicators.generalService?.fixedKm,
      fixedDays: healthIndicators.generalService?.fixedDays,
      lifespanDays: 180 
    },
    { 
      key: 'brakePads', 
      label: 'Brake Pads', 
      icon: '🛑', 
      value: calculateCurrentValue(healthIndicators.brakePads),
      fixedKm: healthIndicators.brakePads?.fixedKm,
      fixedDays: healthIndicators.brakePads?.fixedDays,
      lifespanDays: 730 
    },
    { 
      key: 'tires', 
      label: 'Tire Condition', 
      icon: '🛞', 
      value: calculateCurrentValue(healthIndicators.tires),
      fixedKm: healthIndicators.tires?.fixedKm,
      fixedDays: healthIndicators.tires?.fixedDays,
      lifespanDays: 1095 
    },
    { 
      key: 'battery', 
      label: 'Battery Health', 
      icon: '🔋', 
      value: calculateCurrentValue(healthIndicators.battery),
      fixedKm: healthIndicators.battery?.fixedKm,
      fixedDays: healthIndicators.battery?.fixedDays,
      lifespanDays: 1460 
    },
    { 
      key: 'wiperBlade', 
      label: 'Wiper Blade', 
      icon: '🧹', 
      value: calculateCurrentValue(healthIndicators.wiperBlade),
      fixedKm: healthIndicators.wiperBlade?.fixedKm,
      fixedDays: healthIndicators.wiperBlade?.fixedDays,
      lifespanDays: 180 
    },
  ];

  return (
    <div className="bg-card text-foreground rounded-3xl p-6 shadow-xl space-y-6 max-w-md w-full border border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold tracking-tight">Vehicle Health Indicators</h3>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border">
            <Info className="w-3 h-3" />
            Merchant Update Only
        </div>
      </div>

      <div className="space-y-6">
        {indicators.map((indicator, index) => {
          return (
            <motion.div 
              key={indicator.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2.5"
            >
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{indicator.icon}</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground text-sm">{indicator.label}</span>
                    <div className="flex gap-3 text-[10px] text-muted-foreground font-medium">
                      {indicator.fixedKm !== undefined && (
                        <span>{indicator.fixedKm.toLocaleString()} KM</span>
                      )}
                      {indicator.fixedDays !== undefined && (
                        <span>{indicator.fixedDays} Days</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-mono font-bold text-sm ${
                    indicator.value > 80 ? 'text-red-600' : 
                    indicator.value > 50 ? 'text-orange-600' : 
                    'text-blue-600'
                  }`}>
                    {indicator.value}%
                  </span>
                </div>
              </div>
              
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${indicator.value}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className={`h-full rounded-full relative ${
                    indicator.value > 80 ? 'bg-gradient-to-r from-red-600 to-red-400' : 
                    indicator.value > 50 ? 'bg-gradient-to-r from-orange-600 to-orange-400' : 
                    'bg-gradient-to-r from-blue-600 to-blue-400'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/10 animate-pulse" />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          Health stats are updated by certified merchants during service inspections.
          Values reflect the remaining lifecycle based on time and mileage.
        </p>
      </div>
    </div>
  );
};

export default VehicleHealthIndicators;
