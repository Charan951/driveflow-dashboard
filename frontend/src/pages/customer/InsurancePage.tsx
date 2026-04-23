import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';

interface Policy {
  id: string;
  vehicleId: string;
  provider: string;
  policyNumber: string;
  type: string;
  premium: number;
  startDate: string;
  expiryDate: string;
  status: string;
  coverage: string[];
  vehicle: Vehicle;
}

const InsurancePage: React.FC = () => {
  return (
    <div className="w-full h-full py-4 lg:py-6 space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Insurance</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Insurance features have been removed from this version of the portal.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-8 sm:py-12 text-center"
      >
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Insurance not available</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4 sm:mb-6">
          Please use the Essentials section to book important add-on services and safety checks for your vehicle.
        </p>
      </motion.div>
    </div>
  );
};

export default InsurancePage;
