import type { Service } from '@/services/serviceService';

export const CHECKOUT_GST_RATE = 0.18;

const round2 = (n: number) => Math.round(n * 100) / 100;

export type OrderTotals = {
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  tax: number;
  total: number;
};

export function isGeneralServiceItem(service: {
  category?: string;
  name?: string;
}): boolean {
  const cat = service.category || '';
  const name = (service.name || '').toLowerCase();
  return (
    cat === 'Periodic' ||
    cat === 'Services' ||
    name.includes('general service')
  );
}

export function isGeneralServiceList(services: unknown): boolean {
  if (!Array.isArray(services)) return false;
  return services.some((raw) => {
    if (typeof raw !== 'object' || !raw) return false;
    return isGeneralServiceItem(raw as Service);
  });
}

export function calculateOrderTotals(
  subtotal: number,
  discountAmount = 0,
  applyTax = true
): OrderTotals {
  const sub = round2(Math.max(0, subtotal));
  const disc = round2(Math.max(0, discountAmount));
  const discountedSubtotal = round2(Math.max(0, sub - disc));
  const tax = applyTax ? round2(discountedSubtotal * CHECKOUT_GST_RATE) : 0;
  const total = round2(discountedSubtotal + tax);
  return { subtotal: sub, discountAmount: disc, discountedSubtotal, tax, total };
}

export function mapCategoryToCouponServiceType(category: string): string | null {
  if (!category) return null;
  const cat = category.toLowerCase();
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

