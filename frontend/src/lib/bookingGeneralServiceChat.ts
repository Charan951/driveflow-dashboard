import type { Service } from '@/services/serviceService';
import { getPreTerminalDeliveryStatus } from '@/lib/statusFlow';

/** Periodic / Services / “general service” workshop bookings (not car-wash flow, not tyre/battery). */
function isGeneralPeriodicWorkshopServices(services: unknown): boolean {
  if (!Array.isArray(services)) return false;
  return services.some((raw) => {
    if (typeof raw !== 'object' || !raw) return false;
    const s = raw as Service;
    const cat = String(s.category || '');
    const name = (s.name || '').toLowerCase();
    return cat === 'Periodic' || cat === 'Services' || name.includes('general service');
  });
}

export function isGeneralWorkshopOrderForChat(booking: {
  services?: unknown;
  batteryTire?: { isBatteryTireService?: boolean };
  carWash?: { isCarWashService?: boolean };
}): boolean {
  if (booking.batteryTire?.isBatteryTireService) return false;
  if (booking.carWash?.isCarWashService) return false;
  return isGeneralPeriodicWorkshopServices(booking.services);
}

/** After merchant marks service started (and through workshop completion / delivery prep). */
const GENERAL_WORKSHOP_CHAT_VISIBLE_STATUSES = new Set<string>([
  'SERVICE_STARTED',
  'SERVICE_COMPLETED',
  'OUT_FOR_DELIVERY',
  'On Hold',
  'QC_PENDING',
]);

/**
 * For general workshop orders, hide the chat FAB until the order reaches a post–service-started status.
 * Other booking types use default ChatWidget rules only.
 */
export function forceHideChatUntilGeneralServiceStarted(booking: {
  services?: unknown;
  batteryTire?: { isBatteryTireService?: boolean };
  carWash?: { isCarWashService?: boolean };
  status: string;
}): boolean {
  if (!isGeneralWorkshopOrderForChat(booking)) return false;
  return !GENERAL_WORKSHOP_CHAT_VISIBLE_STATUSES.has(booking.status);
}

export function forceHideChatWhenServiceCompleted(booking: {
  status: string;
  paymentStatus?: string;
}): boolean {
  if (String(booking.paymentStatus || '').toLowerCase() === 'paid') return true;
  if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(booking.status)) return true;
  return false;
}

/**
 * Whether the customer UI may show the delivery OTP code.
 * For all service types: only on the step immediately before DELIVERED (or before COMPLETED for flows that end there).
 */
export function canCustomerSeeDeliveryOtp(booking: {
  status: string;
  services?: unknown;
  batteryTire?: { isBatteryTireService?: boolean };
  carWash?: { isCarWashService?: boolean };
}): boolean {
  const pre = getPreTerminalDeliveryStatus(Array.isArray(booking.services) ? booking.services : []);
  if (!pre) return false;
  return booking.status === pre;
}
