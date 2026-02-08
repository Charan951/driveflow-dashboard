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
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const vehicles = await vehicleService.getVehicles();
      const validPolicies = vehicles
        .filter((v: Vehicle) => v.insurance && v.insurance.policyNumber)
        .map((v: Vehicle) => ({
          id: v.insurance!.policyNumber,
          vehicleId: v._id,
          provider: v.insurance!.provider || 'Unknown Provider',
          policyNumber: v.insurance!.policyNumber,
          type: 'Comprehensive', // Mock data as backend doesn't store this yet
          premium: 1200, // Mock data
          startDate: v.insurance!.startDate ? new Date(v.insurance!.startDate).toISOString().split('T')[0] : 'N/A',
          expiryDate: v.insurance!.expiryDate ? new Date(v.insurance!.expiryDate).toISOString().split('T')[0] : 'N/A',
          status: v.insurance!.status || 'Active',
          coverage: ['Accident Damage', 'Theft', 'Fire', 'Natural Disasters', 'Third Party'], // Mock data
          vehicle: v
        }));
      setPolicies(validPolicies);
    } catch (error) {
      console.error('Error fetching insurance policies:', error);
      toast.error('Failed to load insurance policies');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = (policyId: string) => {
    toast.success('Renewal request submitted!');
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    if (expiryDate === 'N/A') return 0;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Insurance</h1>
        <p className="text-muted-foreground">Manage your vehicle insurance policies</p>
      </div>

      {policies.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Active Policies</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            You don't have any active insurance policies linked to your vehicles.
          </p>
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
            Get a Quote
          </button>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {policies.map((policy) => {
            const daysUntilExpiry = getDaysUntilExpiry(policy.expiryDate);
            const isExpiringSoon = daysUntilExpiry <= 30;
            const isExpired = daysUntilExpiry < 0;

            return (
              <motion.div
                key={policy.id}
                variants={staggerItem}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                {/* Status Banner */}
                {(isExpiringSoon || isExpired) && (
                  <div className={`px-4 py-2 flex items-center gap-2 ${
                    isExpired ? 'bg-destructive/10' : 'bg-warning/10'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      isExpired ? 'text-destructive' : 'text-warning'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isExpired ? 'text-destructive' : 'text-warning'
                    }`}>
                      {isExpired 
                        ? 'Policy expired' 
                        : `Expires in ${daysUntilExpiry} days`
                      }
                    </span>
                  </div>
                )}

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{policy.type}</h3>
                        <p className="text-sm text-muted-foreground">{policy.provider}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      policy.status === 'Active'
                        ? 'bg-success/10 text-success'
                        : policy.status === 'Expiring Soon'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {policy.status}
                    </span>
                  </div>

                  {/* Vehicle Info */}
                  <div className="bg-muted/50 rounded-xl p-3 mb-4">
                    <p className="text-sm text-muted-foreground">Covered Vehicle</p>
                    <p className="font-medium text-foreground">
                      {policy.vehicle.year} {policy.vehicle.make} {policy.vehicle.model} • {policy.vehicle.licensePlate}
                    </p>
                  </div>

                  {/* Policy Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Policy Number</p>
                      <p className="text-sm font-medium">{policy.policyNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Premium</p>
                      <p className="text-sm font-medium">${policy.premium}/year</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                      <p className="text-sm font-medium">{policy.startDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Expiry Date</p>
                      <p className="text-sm font-medium">{policy.expiryDate}</p>
                    </div>
                  </div>

                  {/* Coverage */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Coverage</p>
                    <div className="flex flex-wrap gap-2">
                      {policy.coverage.map((item, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-lg text-xs"
                        >
                          <Check className="w-3 h-3 text-success" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2">
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {(isExpiringSoon || isExpired) && (
                      <button
                        onClick={() => handleRenew(policy.id)}
                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Renew Now
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add New Policy */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full p-4 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-3"
      >
        <Shield className="w-5 h-5 text-primary" />
        <span className="font-medium text-foreground">Get New Insurance Quote</span>
      </motion.button>
    </div>
  );
};

export default InsurancePage;
