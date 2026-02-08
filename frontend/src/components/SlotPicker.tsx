import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return date1.toDateString() === date2.toDateString();
  };

  const isPastDate = (date: Date) => {
    return date < today;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Calendar */}
      <div className="bg-card rounded-2xl border border-border p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.95 }}
              onClick={() => day && !isPastDate(day) && onDateChange(day)}
              disabled={!day || isPastDate(day)}
              className={cn(
                'aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-colors',
                !day && 'invisible',
                day && isPastDate(day) && 'text-muted-foreground/50 cursor-not-allowed',
                day && !isPastDate(day) && 'hover:bg-muted cursor-pointer',
                day && isSameDay(day, selectedDate) && 'bg-primary text-primary-foreground hover:bg-primary/90',
                day && isSameDay(day, today) && !isSameDay(day, selectedDate) && 'ring-2 ring-primary/30'
              )}
            >
              {day?.getDate()}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h4 className="font-medium text-sm text-muted-foreground">Available Time Slots</h4>
          <div className="flex flex-wrap gap-2">
            {availableSlots.map((slot) => (
              <motion.button
                key={slot}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTimeChange(slot)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  selectedTime === slot
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                )}
              >
                {slot}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SlotPicker;
