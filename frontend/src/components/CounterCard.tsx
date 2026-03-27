import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CounterCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  delay?: number;
  onClick?: () => void;
}

export const CounterCard: React.FC<CounterCardProps> = ({
  label,
  value,
  icon,
  trend,
  className,
  delay = 0,
  onClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      onClick={onClick}
      className={cn(
        'p-3 sm:p-4 bg-card rounded-2xl border border-border shadow-card transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.98]',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{label}</p>
        {icon && (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      
      <motion.p
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10, delay: delay * 0.1 + 0.2 }}
        className="text-lg sm:text-2xl font-bold text-foreground"
      >
        {value}
      </motion.p>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={cn(
              'text-xs font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </motion.div>
  );
};

export default CounterCard;
