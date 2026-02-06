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
}

export const CounterCard: React.FC<CounterCardProps> = ({
  label,
  value,
  icon,
  trend,
  className,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className={cn(
        'p-4 bg-card rounded-2xl border border-border shadow-card',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      
      <motion.p
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10, delay: delay * 0.1 + 0.2 }}
        className="text-2xl font-bold text-foreground"
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
