import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, AlertTriangle, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { insurancePolicies, vehicles } from '@/services/dummyData';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';

const InsurancePage: React.FC = () => {
  const handleRenew = (policyId: string) => {
    toast.success('Renewal request submitted!');
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Insurance</h1>
        <p className="text-muted-foreground">Manage your vehicle insurance policies</p>
      </div>

      {/* Policy Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {insurancePolicies.map((policy) => {
          const vehicle = vehicles.find(v => v.id === policy.vehicleId);
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
                    policy.status === 'active'
                      ? 'bg-success/10 text-success'
                      : policy.status === 'expiring_soon'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {policy.status === 'active' ? 'Active' : 
                     policy.status === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
                  </span>
                </div>

                {/* Vehicle Info */}
                <div className="bg-muted/50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-muted-foreground">Covered Vehicle</p>
                  <p className="font-medium text-foreground">
                    {vehicle?.year} {vehicle?.make} {vehicle?.model} • {vehicle?.licensePlate}
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
