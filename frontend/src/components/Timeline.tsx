import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStep {
  step: string;
  completed: boolean;
  time?: string;
  active?: boolean;
}

interface TimelineProps {
  steps: TimelineStep[];
  vertical?: boolean;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  steps,
  vertical = true,
  className,
}) => {
  const activeIndex = steps.findIndex((s) => !s.completed);

  return (
    <div className={cn(
      vertical 
        ? 'space-y-0' 
        : 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-2', 
      className
    )}>
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isCompleted = step.completed;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={index}
            className={cn(
              vertical
                ? 'flex gap-4'
                : 'flex flex-row sm:flex-col items-center sm:text-center flex-1 gap-3 sm:gap-0'
            )}
          >
            {/* Dot and Line */}
            <div className={cn(
              vertical 
                ? 'flex flex-col items-center' 
                : 'flex flex-row sm:flex-col items-center w-auto sm:w-full'
            )}>
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isCompleted
                    ? 'hsl(var(--success))'
                    : isActive
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted))',
                }}
                className={cn(
                  'w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10',
                  isActive && 'ring-2 sm:ring-4 ring-primary/20'
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-success-foreground" />
                ) : (
                  <span
                    className={cn(
                      'text-xs font-bold',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-primary/20"
                  />
                )}
              </motion.div>

              {!isLast && !vertical && (
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--muted))',
                  }}
                  className="hidden sm:block h-0.5 flex-1 mx-2"
                />
              )}

              {!isLast && vertical && (
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--muted))',
                  }}
                  className="w-0.5 h-12 -my-1"
                />
              )}
            </div>

            {/* Content */}
            <div className={cn(
              vertical ? 'pb-8' : 'flex-1 sm:mt-3',
              !vertical && 'min-w-0'
            )}>
              <p
                className={cn(
                  'font-medium text-xs sm:text-sm leading-tight',
                  isCompleted || isActive ? 'text-foreground' : 'text-muted-foreground',
                  !vertical && 'line-clamp-2 sm:line-clamp-none'
                )}
              >
                {step.step}
              </p>
              {step.time && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.time}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
