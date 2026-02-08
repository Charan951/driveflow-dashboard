import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardHover } from '@/animations/variants';

interface ServiceCardProps {
  icon: LucideIcon;
  name: string;
  description: string;
  price?: number;
  duration?: string;
  popular?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  icon: Icon,
  name,
  description,
  price,
  duration,
  popular,
  onClick,
  className,
}) => {
  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      className={cn(
        'relative p-6 bg-card rounded-2xl border border-border cursor-pointer',
        'shadow-card transition-shadow duration-300',
        className
      )}
    >
      {popular && (
        <span className="absolute top-3 right-3 px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase rounded-full">
          Popular
        </span>
      )}
      
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      
      <h3 className="font-semibold text-foreground mb-1">{name}</h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
      
      <div className="flex items-center justify-between">
        {price !== undefined && (
          <span className="text-lg font-bold text-primary">${price}</span>
        )}
        {duration && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {duration}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default ServiceCard;
