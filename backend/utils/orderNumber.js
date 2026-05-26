import Counter from '../models/Counter.js';

const ORDER_PREFIX = 'INV';

/** YYYYMMDD in Asia/Kolkata (IST). */
export function getISTDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}${month}${day}`;
}

/**
 * Generate order number: INV + YYYYMMDD (IST) + NN (daily sequence, min 2 digits).
 * Example: INV2025052101, INV2025052112, INV20250521100
 */
export async function generateOrderNumber(date = new Date()) {
  const dateKey = getISTDateKey(date);
  const counterName = `order-inv-${dateKey}`;
  const seq = await Counter.next(counterName);
  const nn = String(seq).padStart(2, '0');
  return `${ORDER_PREFIX}${dateKey}${nn}`;
}

export function formatOrderReference(booking) {
  if (booking?.orderNumber != null && String(booking.orderNumber).trim() !== '') {
    return String(booking.orderNumber);
  }
  const id = booking?._id;
  if (!id) return '';
  return String(id).slice(-6).toUpperCase();
}
