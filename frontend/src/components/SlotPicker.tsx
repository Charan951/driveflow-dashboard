import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Clock, ChevronDown } from 'lucide-react';

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
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Date Selection */}
        <div className="space-y-2 sm:space-y-3">
          <label className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
            <span>Select Date</span>
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
              className="w-full bg-card border-2 border-border rounded-xl sm:rounded-2xl p-3 sm:p-5 pr-12 sm:pr-14 text-base sm:text-lg font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all hover:border-primary/30 cursor-pointer [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              placeholder="dd-mm-yyyy"
            />
            <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2 sm:gap-3 text-muted-foreground group-hover:text-primary transition-colors">
              <div className="w-px h-4 sm:h-6 bg-border" />
              <CalendarIcon className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Time Selection */}
        <div className="space-y-2 sm:space-y-3">
          <label className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
            <span>Select Time</span>
          </label>
          <div className="relative group">
            <input
              type="time"
              value={selectedTime ? (() => {
                const [time, modifier] = selectedTime.split(' ');
                let [hours, minutes] = time.split(':');
                if (modifier === 'PM' && hours !== '12') hours = (parseInt(hours) + 12).toString();
                if (modifier === 'AM' && hours === '12') hours = '00';
                return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
              })() : ''}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(':');
                const h = parseInt(hours);
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayH = h % 12 || 12;
                onTimeChange(`${displayH}:${minutes} ${ampm}`);
              }}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              className="w-full bg-card border-2 border-border rounded-xl sm:rounded-2xl p-3 sm:p-5 pr-12 sm:pr-14 text-base sm:text-lg font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all hover:border-primary/30 cursor-pointer [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2 sm:gap-3 text-muted-foreground group-hover:text-primary transition-colors">
              <div className="w-px h-4 sm:h-6 bg-border" />
              <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotPicker;
