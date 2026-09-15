import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Droplets, Battery, Package, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CATEGORIES = [
  {
    category: 'Periodic',
    label: 'services',
    description: 'General maintenance & repairs',
    icon: Wrench,
    iconWrapClass: 'bg-primary/10 group-hover:bg-primary/20',
    iconClass: 'text-primary',
    borderClass: 'hover:border-primary hover:bg-primary/5',
    chevronClass: 'group-hover:text-primary',
  },
  {
    category: 'Wash',
    label: 'Car Wash',
    description: 'Premium cleaning services',
    icon: Droplets,
    iconWrapClass: 'bg-blue-100 group-hover:bg-blue-200',
    iconClass: 'text-blue-600',
    borderClass: 'hover:border-blue-500 hover:bg-blue-50',
    chevronClass: 'group-hover:text-blue-500',
  },
  {
    category: 'Tyres',
    label: 'Battery/tyres',
    description: 'Replacement & maintenance',
    icon: Battery,
    iconWrapClass: 'bg-orange-100 group-hover:bg-orange-200',
    iconClass: 'text-orange-600',
    borderClass: 'hover:border-orange-500 hover:bg-orange-50',
    chevronClass: 'group-hover:text-orange-500',
  },
  {
    category: 'Essentials',
    label: 'Essentials',
    description: 'Quick utility & care services',
    icon: Package,
    iconWrapClass: 'bg-purple-100 group-hover:bg-purple-200',
    iconClass: 'text-purple-600',
    borderClass: 'hover:border-purple-500 hover:bg-purple-50',
    chevronClass: 'group-hover:text-purple-500',
  },
] as const;

interface ServiceCategoryDialogProps {
  trigger: React.ReactNode;
  /** When opened from a specific vehicle's page, carries that vehicle
   * through to the booking wizard so it doesn't ask the user to pick a
   * vehicle again — same navigation state BookServicePage already reads
   * from VehicleDetailPage's own "Book Service" flow. */
  vehicleId?: string;
}

/** "Select Service Category" picker — shared by the dashboard's Book
 * Service button and a vehicle's own Book Service button, so both send
 * the customer to the wizard pre-filtered to the right category. */
const ServiceCategoryDialog: React.FC<ServiceCategoryDialogProps> = ({ trigger, vehicleId }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Select Service Category</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {CATEGORIES.map(({ category, label, description, icon: Icon, iconWrapClass, iconClass, borderClass, chevronClass }) => (
            <Link
              key={category}
              to={{ pathname: '/book-service', search: `?category=${category}` }}
              state={vehicleId ? { vehicleId } : undefined}
              className={`group flex items-center gap-4 p-4 rounded-xl border border-border transition-all ${borderClass}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${iconWrapClass}`}>
                <Icon className={`w-6 h-6 ${iconClass}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-colors ${chevronClass}`} />
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceCategoryDialog;
