import React from 'react';
import { motion } from 'framer-motion';
import { Car, MoreVertical, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardHover } from '@/animations/variants';

interface VehicleCardProps {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  image?: string;
  nextService?: string;
  status?: string;
  onClick?: () => void;
  onDelete?: () => void;
  className?: string;
  compact?: boolean;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  make,
  model,
  year,
  licensePlate,
  image,
  nextService,
  status = 'Idle',
  onClick,
  onDelete,
  className,
  compact = false,
}) => {
  if (compact) {
    return (
      <motion.div
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        onClick={onClick}
        className={cn(
          'flex items-center gap-4 p-4 bg-card rounded-2xl border border-border cursor-pointer',
          'shadow-card',
          className
        )}
      >
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
          {image ? (
            <img src={image} alt={`${make} ${model}`} className="w-full h-full object-cover" />
          ) : (
            <Car className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">
            {year} {make} {model}
          </h4>
          <p className="text-sm text-muted-foreground">{licensePlate}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      className={cn(
        'relative p-4 bg-card rounded-2xl border border-border cursor-pointer min-w-[280px]',
        'shadow-card',
        className
      )}
    >
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-3 right-3 p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <div className="w-full h-32 rounded-xl bg-muted flex items-center justify-center overflow-hidden mb-4 relative">
        {status && (
            <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold z-10 ${
                status === 'Idle' ? 'bg-background/80 text-muted-foreground backdrop-blur-sm' : 'bg-primary text-primary-foreground'
            }`}>
                {status}
            </div>
        )}
        {image ? (
          <img src={image} alt={`${make} ${model}`} className="w-full h-full object-cover" />
        ) : (
          <Car className="w-16 h-16 text-muted-foreground" />
        )}
      </div>

      <h3 className="font-semibold text-foreground mb-1">
        {year} {make} {model}
      </h3>
      <p className="text-sm text-muted-foreground mb-3">{licensePlate}</p>

      {nextService && (
        <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-accent font-medium">
            Next service: {nextService}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default VehicleCard;
