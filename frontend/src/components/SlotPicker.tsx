import React from 'react';
import { cn, formatLocalYmd, startOfLocalDay, isSlotStartInPast, isSameLocalCalendarDay } from '@/lib/utils';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { isValidDate } from '@/lib/formValidation';
import { toast } from 'sonner';

export const BOOKING_SLOT_CATALOG = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
];

interface SlotPickerProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  availableSlots?: string[];
  bookedSlots?: string[];
  blockedSlots?: string[];
  allSlotsFromApi?: string[];
  className?: string;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  availableSlots = BOOKING_SLOT_CATALOG,
  bookedSlots = [],
  blockedSlots = [],
  allSlotsFromApi = [],
  className,
}) => {
  const selectedDateValue = selectedDate ? formatLocalYmd(selectedDate) : '';
  const hasSelectedSlot = Boolean(selectedDate && selectedTime);
  const slotCatalog = allSlotsFromApi.length > 0 ? allSlotsFromApi : BOOKING_SLOT_CATALOG;

  /** On today, past times are omitted from the list entirely (not shown as disabled). */
  const visibleSlots =
    selectedDate && isSameLocalCalendarDay(selectedDate)
      ? slotCatalog.filter((slot) => !isSlotStartInPast(selectedDate, slot))
      : slotCatalog;

  const unavailableSet = new Set([...bookedSlots, ...blockedSlots]);

  const isSlotSelectable = (slot: string) => {
    if (unavailableSet.has(slot)) return false;
    const fromApi = availableSlots.includes(slot);
    if (!fromApi) return false;
    if (selectedDate && isSameLocalCalendarDay(selectedDate) && isSlotStartInPast(selectedDate, slot)) {
      return false;
    }
    return true;
  };

  const selectableSlots = visibleSlots.filter((slot) => isSlotSelectable(slot));
  const bookedVisibleCount = visibleSlots.filter((slot) => unavailableSet.has(slot)).length;
  const displayAvailable = selectableSlots.length;
  const displayBooked = bookedVisibleCount;

  return (
    <div className={cn('space-y-4 min-w-0 max-w-full overflow-hidden', className)}>
      <div className="grid grid-cols-1 gap-4 min-w-0">
        {/* Date Selection */}
        <div className="space-y-2 min-w-0">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Select Date</span>
          </label>
          <div className="relative group rounded-2xl border border-border/80 bg-muted/20 p-2 min-w-0 max-w-full overflow-hidden">
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
              className="w-full min-w-0 max-w-full box-border bg-background border-2 border-border rounded-xl px-4 py-3.5 pr-12 text-base font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all hover:border-primary/30 cursor-pointer [color-scheme:light] appearance-none"
              placeholder="dd-mm-yyyy"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
              <div className="w-px h-5 bg-border" />
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Slot Selection */}
        <div className="space-y-2 min-w-0">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Select Slot</span>
          </label>
          <div className="rounded-xl border-2 border-border bg-card p-3 sm:p-4 space-y-3 min-w-0 max-w-full overflow-hidden">
            {selectedDate && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary whitespace-nowrap">
                  {displayAvailable} available
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  {displayBooked} booked
                </span>
                {hasSelectedSlot && selectedTime && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 whitespace-nowrap">
                    Selected: {selectedTime}
                  </span>
                )}
              </div>
            )}
            {!selectedDate ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4">
                <p className="text-sm text-muted-foreground">Select a date first to view available slots.</p>
              </div>
            ) : displayAvailable === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4">
                <p className="text-sm text-muted-foreground">No slots available for this date. Please choose another date.</p>
              </div>
            ) : (
              <div className="space-y-3 min-w-0">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto overflow-x-hidden min-w-0">
                  {visibleSlots.map((slot) => {
                    const isSelectable = isSlotSelectable(slot);
                    const isSelected = selectedTime === slot;
                    const isBooked = unavailableSet.has(slot) || !availableSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!isSelectable}
                        onClick={() => onTimeChange(slot)}
                        className={cn(
                          'min-w-0 px-2 py-2 rounded-lg border text-xs sm:text-sm font-semibold transition-colors truncate',
                          isSelected && isSelectable
                            ? 'border-primary bg-primary text-primary-foreground'
                            : isSelectable
                              ? 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
                              : 'border-border/60 bg-muted/40 text-muted-foreground cursor-not-allowed line-through'
                        )}
                        title={isBooked ? `${slot} (Booked)` : slot}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {hasSelectedSlot && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <p className="text-xs text-primary font-semibold">
                      Selected: {selectedTime}
                    </p>
                  </div>
                )}
                {selectedTime && !isSlotSelectable(selectedTime) && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <p className="text-xs text-destructive font-semibold">
                      This slot is no longer available. Please choose another slot.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block shrink-0" /> Available
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block shrink-0" /> Booked
                </span>
              </div>
              {selectedDate && (
                <span className="whitespace-nowrap">{displayAvailable} slots bookable</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotPicker;
