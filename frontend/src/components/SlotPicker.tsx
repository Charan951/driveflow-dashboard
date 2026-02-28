import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

interface SlotPickerProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  availableSlots?: string[];
  className?: string;
}

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

export const SlotPicker: React.FC<SlotPickerProps> = ({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  availableSlots = timeSlots,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-3">
        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          Select Date
        </label>
        <div className="relative group">
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                onDateChange(date);
              }
            }}
            onClick={(e) => (e.currentTarget as any).showPicker?.()}
            className="w-full bg-card border-2 border-border rounded-2xl p-5 pr-14 text-lg font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all hover:border-primary/30 cursor-pointer [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            placeholder="dd-mm-yyyy"
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
            <div className="w-px h-6 bg-border" />
            <CalendarIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Available Time Slots
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {availableSlots.map((slot) => (
            <motion.button
              key={slot}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTimeChange(slot)}
              className={cn(
                'px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 border-2',
                selectedTime === slot
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                  : 'bg-card border-border hover:border-primary/30 text-foreground'
              )}
            >
              {slot}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SlotPicker;
