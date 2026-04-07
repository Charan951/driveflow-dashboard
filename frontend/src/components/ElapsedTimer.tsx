import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ElapsedTimerProps {
  startTime: string | Date | undefined;
  className?: string;
}

const ElapsedTimer: React.FC<ElapsedTimerProps> = ({ startTime, className }) => {
  const [elapsed, setElapsed] = useState<string>('00:00:00');

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = now - start;
      
      if (diff < 0) {
        setElapsed('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
      ].join(':');

      setElapsed(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) return null;

  return (
    <div className={`flex items-center gap-2 font-mono text-sm ${className}`}>
      <Clock className="w-4 h-4 text-primary" />
      <span>{elapsed}</span>
    </div>
  );
};

export default ElapsedTimer;
