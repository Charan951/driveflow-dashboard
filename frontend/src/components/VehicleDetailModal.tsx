import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Vehicle } from '@/services/vehicleService';
import { 
  Car, 
  Calendar, 
  Hash, 
  Fuel, 
  Palette, 
  Wrench, 
  ShieldCheck, 
  Navigation,
  Disc
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({ vehicle, isOpen, onClose }) => {
  if (!vehicle) return null;

  const detailItems = [
    { icon: <Hash className="w-4 h-4" />, label: 'Registration', value: vehicle.licensePlate },
    { icon: <Car className="w-4 h-4" />, label: 'Variant', value: vehicle.variant || 'Not specified' },
    { icon: <Calendar className="w-4 h-4" />, label: 'Year', value: vehicle.year },
    { icon: <Fuel className="w-4 h-4" />, label: 'Fuel Type', value: vehicle.fuelType || 'Not specified' },
    { icon: <Palette className="w-4 h-4" />, label: 'Color', value: vehicle.color || 'Not specified' },
    { icon: <Navigation className="w-4 h-4" />, label: 'Mileage', value: vehicle.mileage ? `${vehicle.mileage} km` : 'Not specified' },
    { icon: <Wrench className="w-4 h-4" />, label: 'Last Service', value: vehicle.lastService || 'No record' },
    { icon: <Calendar className="w-4 h-4" />, label: 'Next Service', value: vehicle.nextService || 'Not scheduled' },
  ];

  const tireDetails = [
    { icon: <Disc className="w-4 h-4" />, label: 'Front Tyres', value: vehicle.frontTyres || 'Not specified' },
    { icon: <Disc className="w-4 h-4" />, label: 'Rear Tyres', value: vehicle.rearTyres || 'Not specified' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              {vehicle.image ? (
                <img src={vehicle.image} alt={vehicle.make} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <Car className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                {vehicle.make} {vehicle.model}
              </DialogTitle>
              <DialogDescription className="text-base">
                {vehicle.year} • {vehicle.licensePlate}
              </DialogDescription>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant={vehicle.status === 'Idle' ? 'secondary' : 'default'}>
              {vehicle.status || 'Idle'}
            </Badge>
            {vehicle.type && <Badge variant="outline">{vehicle.type}</Badge>}
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vehicle Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {detailItems.map((item, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {item.icon}
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          {vehicle.insurance && (
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Insurance Details</h3>
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{vehicle.insurance.provider}</p>
                    <p className="text-xs text-muted-foreground">Policy: {vehicle.insurance.policyNumber}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={vehicle.insurance.status === 'Active' ? 'success' : 'destructive'} className="text-[10px]">
                        {vehicle.insurance.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Expires: {vehicle.insurance.expiryDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {vehicle.vin && (
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">VIN Number</h3>
              <div className="bg-muted/30 rounded-lg p-3 border border-border">
                <code className="text-sm font-mono break-all">{vehicle.vin}</code>
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailModal;
