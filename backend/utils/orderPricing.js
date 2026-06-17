/** Customer checkout GST rate (18% on subtotal after coupon discount). */
export const CHECKOUT_GST_RATE = 0.18;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function isGeneralServiceItem(service) {
  if (!service) return false;
  const cat = service.category || '';
  const name = String(service.name || '').toLowerCase();
  return (
    cat === 'Periodic' ||
    cat === 'Services' ||
    name.includes('general service')
  );
}

export function isGeneralServiceList(services) {
  if (!Array.isArray(services) || services.length === 0) return false;
  return services.some(isGeneralServiceItem);
}

export async function isGeneralServiceByIds(serviceIds) {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) return false;
  try {
    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: serviceIds } }).lean();
    return isGeneralServiceList(services);
  } catch {
    return false;
  }
}

/** Prepaid checkout tax applies only to non–general-service bookings. */
export async function shouldApplyCheckoutGst(tempOrBookingData) {
  if (!tempOrBookingData) return false;
  if (tempOrBookingData.applyCheckoutGst === false) return false;
  if (isGeneralServiceList(tempOrBookingData.services)) return false;
  if (tempOrBookingData.serviceIds?.length) {
    return !(await isGeneralServiceByIds(tempOrBookingData.serviceIds));
  }
  return !!tempOrBookingData.requiresPaymentService;
}

/**
 * @param {number} subtotal - Services + pickup (before coupon and tax)
 * @param {number} [discountAmount=0] - Coupon discount applied to subtotal
 * @param {boolean} [applyTax=true] - When false (general service), tax is 0
 */
export function calculateOrderTotals(subtotal, discountAmount = 0, applyTax = true) {
  const sub = round2(Math.max(0, subtotal));
  const disc = round2(Math.max(0, discountAmount));
  const discountedSubtotal = round2(Math.max(0, sub - disc));
  const tax = applyTax ? round2(discountedSubtotal * CHECKOUT_GST_RATE) : 0;
  const total = round2(discountedSubtotal + tax);
  return {
    subtotal: sub,
    discountAmount: disc,
    discountedSubtotal,
    tax,
    total,
  };
}

export function mapCategoryToCouponServiceType(category) {
  if (!category) return null;
  const cat = String(category).toLowerCase();
  if (cat.includes('wash') || cat.includes('detailing')) return 'Car Wash';
  if (cat.includes('essential') || cat.includes('accessories')) return 'Essentials';
  if (cat.includes('tyre') || cat.includes('tire') || cat.includes('battery')) {
    return 'Tyres and Battery';
  }
  if (
    cat.includes('periodic') ||
    cat.includes('general') ||
    cat === 'services' ||
    cat === 'repair' ||
    cat === 'ac' ||
    cat === 'painting' ||
    cat === 'denting'
  ) {
    return 'General Service';
  }
  return null;
}

