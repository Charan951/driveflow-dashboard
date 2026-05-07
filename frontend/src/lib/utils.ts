import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Local calendar day as YYYY-MM-DD (for `<input type="date">` and slot APIs; avoids UTC `toISOString` day shifts). */
export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Same calendar day at 00:00:00 local time. */
export function startOfLocalDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Parse labels like "8:00 AM", "12:30 PM" to minutes from midnight (local). */
export function parseSlotTimeLabelToMinutes(label: string): number | null {
  const m = String(label).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Local Date at slot start on the given calendar day. */
export function localDateAtSlotStart(day: Date, slotLabel: string): Date | null {
  const mins = parseSlotTimeLabelToMinutes(slotLabel);
  if (mins === null) return null;
  const d = startOfLocalDay(day);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

/** True if slot window start is strictly before `now` (same local day as `day`). */
export function isSlotStartInPast(day: Date, slotLabel: string, now: Date = new Date()): boolean {
  const t = localDateAtSlotStart(day, slotLabel);
  if (!t) return true;
  return t.getTime() < now.getTime();
}

/** True when `day` is today in the user's local timezone. */
export function isSameLocalCalendarDay(a: Date, b: Date = new Date()): boolean {
  return formatLocalYmd(a) === formatLocalYmd(b);
}
