import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardHover } from '@/animations/variants';

interface OrderCardProps {
  id: string;
  service: string;
  vehicle: {
    make: string;
    model: string;
    licensePlate: string;
  };
  status: string;
  scheduledDate: string;
  scheduledTime?: string;
  price?: number;
  onClick?: () => void;
  className?: string;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
  confirmed: { bg: 'bg-primary/10', text: 'text-primary', label: 'Confirmed' },
  in_transit: { bg: 'bg-accent/10', text: 'text-accent', label: 'In Transit' },
  in_progress: { bg: 'bg-accent/10', text: 'text-accent', label: 'In Progress' },
  completed: { bg: 'bg-success/10', text: 'text-success', label: 'Completed' },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Cancelled' },
};

export const OrderCard: React.FC<OrderCardProps> = ({
  id,
  service,
  vehicle,
  status,
  scheduledDate,
  scheduledTime,
  price,
  onClick,
  className,
}) => {
  const statusStyle = statusColors[status] || statusColors.pending;

  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      className={cn(
        'p-4 bg-card rounded-2xl border border-border cursor-pointer',
        'shadow-card',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Order #{id}</p>
          <h3 className="font-semibold text-foreground">{service}</h3>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusStyle.bg, statusStyle.text)}>
          {statusStyle.label}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {vehicle.make} {vehicle.model} • {vehicle.licensePlate}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{scheduledDate}</span>
          {scheduledTime && <span>• {scheduledTime}</span>}
        </div>
        <div className="flex items-center gap-2">
          {price !== undefined && (
            <span className="font-semibold text-primary">${price}</span>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
};

export default OrderCard;
