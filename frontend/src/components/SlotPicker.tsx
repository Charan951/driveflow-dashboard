import React from 'react';
import { cn, formatLocalYmd, startOfLocalDay, isSlotStartInPast, isSameLocalCalendarDay } from '@/lib/utils';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { isValidDate } from '@/lib/formValidation';
import { toast } from 'sonner';

interface SlotPickerProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  availableSlots?: string[];
  className?: string;
}

const allSlots = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
];

export const SlotPicker: React.FC<SlotPickerProps> = ({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  availableSlots = allSlots,
  className,
}) => {
  const selectedDateValue = selectedDate ? formatLocalYmd(selectedDate) : '';
  const hasSelectedSlot = Boolean(selectedDate && selectedTime);
  /** On today, past times are omitted from the list entirely (not shown as disabled). */
  const visibleSlots =
    selectedDate && isSameLocalCalendarDay(selectedDate)
      ? allSlots.filter((slot) => !isSlotStartInPast(selectedDate, slot))
      : allSlots;

  const isSlotSelectable = (slot: string) => {
    const fromApi = availableSlots.includes(slot);
    if (!fromApi) return false;
    if (selectedDate && isSameLocalCalendarDay(selectedDate) && isSlotStartInPast(selectedDate, slot)) {
      return false;
    }
    return true;
  };
  const availableCount = selectedDate
    ? visibleSlots.filter((slot) => isSlotSelectable(slot)).length
    : 0;
  const bookedCount = selectedDate ? visibleSlots.length - availableCount : 0;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Date Selection */}
        <div className="space-y-2 lg:col-span-4">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Select Date</span>
          </label>
          <div className="relative group rounded-2xl border border-border/80 bg-muted/20 p-2">
            <input
              type="date"
              min={formatLocalYmd(startOfLocalDay())}
              max="2100-12-31"
              maxLength={10}
              value={selectedDateValue}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                if (v.length > 10) {
                  toast.error('Too long data: Please enter a valid date');
                  return;
                }
                const [y, mo, d] = v.split('-').map(Number);
                if (!y || !mo || !d) return;
                const date = new Date(y, mo - 1, d);
                if (!isNaN(date.getTime())) {
                  onDateChange(startOfLocalDay(date));
                }
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val && !isValidDate(val)) {
                  toast.error('Please enter a valid date');
                }
              }}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              className="w-full bg-background border-2 border-border rounded-xl px-4 py-3.5 pr-12 text-base font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all hover:border-primary/30 cursor-pointer [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              placeholder="dd-mm-yyyy"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
              <div className="w-px h-5 bg-border" />
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Slot Selection */}
        <div className="space-y-2 lg:col-span-8">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Select Slot</span>
          </label>
          <div className="rounded-xl border-2 border-border bg-card p-3 sm:p-4 space-y-3">
            {selectedDate && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {availableCount} available
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {bookedCount} booked
                </span>
              </div>
            )}
            {!selectedDate ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4">
                <p className="text-sm text-muted-foreground">Select a date first to view available slots.</p>
              </div>
            ) : availableCount === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4">
                <p className="text-sm text-muted-foreground">No slots available for this date. Please choose another date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedTime || ''}
                  onChange={(e) => onTimeChange(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="" disabled>
                    Select an available slot
                  </option>
                  {visibleSlots.map((slot) => {
                    const isAvailable = availableSlots.includes(slot);
                    const isSelectable = isSlotSelectable(slot);
                    return (
                      <option key={slot} value={slot} disabled={!isSelectable}>
                        {slot}
                        {!isAvailable ? ' (Booked)' : ''}
                      </option>
                    );
                  })}
                </select>
                {hasSelectedSlot && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <p className="text-xs text-primary font-semibold">
                      Selected: {selectedTime}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Available</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" /> Booked</span>
              {selectedDate && (
                <span>{availableCount} slots bookable</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotPicker;
