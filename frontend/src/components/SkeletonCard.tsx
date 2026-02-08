import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  variant?: 'default' | 'vehicle' | 'order' | 'service';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className,
  variant = 'default',
}) => {
  if (variant === 'vehicle') {
    return (
      <div className={cn('p-4 bg-card rounded-2xl border border-border animate-pulse', className)}>
        <div className="w-full h-32 skeleton rounded-xl mb-4" />
        <div className="h-5 skeleton rounded w-3/4 mb-2" />
        <div className="h-4 skeleton rounded w-1/2" />
      </div>
    );
  }

  if (variant === 'order') {
    return (
      <div className={cn('p-4 bg-card rounded-2xl border border-border animate-pulse', className)}>
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2">
            <div className="h-3 skeleton rounded w-20" />
            <div className="h-5 skeleton rounded w-32" />
          </div>
          <div className="h-6 skeleton rounded-full w-20" />
        </div>
        <div className="h-4 skeleton rounded w-2/3 mb-4" />
        <div className="flex items-center justify-between">
          <div className="h-4 skeleton rounded w-24" />
          <div className="h-5 skeleton rounded w-16" />
        </div>
      </div>
    );
  }

  if (variant === 'service') {
    return (
      <div className={cn('p-6 bg-card rounded-2xl border border-border animate-pulse', className)}>
        <div className="w-12 h-12 skeleton rounded-xl mb-4" />
        <div className="h-5 skeleton rounded w-3/4 mb-2" />
        <div className="h-4 skeleton rounded w-full mb-2" />
        <div className="h-4 skeleton rounded w-2/3 mb-4" />
        <div className="flex items-center justify-between">
          <div className="h-6 skeleton rounded w-16" />
          <div className="h-5 skeleton rounded-full w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-card rounded-2xl border border-border animate-pulse', className)}>
      <div className="h-4 skeleton rounded w-3/4 mb-2" />
      <div className="h-4 skeleton rounded w-1/2" />
    </div>
  );
};

export const SkeletonList: React.FC<{ count?: number; variant?: SkeletonCardProps['variant'] }> = ({
  count = 3,
  variant = 'default',
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
};

export default SkeletonCard;
