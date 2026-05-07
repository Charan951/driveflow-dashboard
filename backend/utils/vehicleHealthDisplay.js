/**
 * Calendar-day decay for merchant health saves (same rules as frontend vehicleHealthRemaining.ts).
 * Baseline calendar day → 100%; each full calendar day after → −1% (min 0).
 */
export function dailyDecayPercentFromBaseline(baselineAt, now = new Date()) {
  if (!baselineAt) return null;
  const baseline = new Date(baselineAt);
  if (Number.isNaN(baseline.getTime())) return null;
  const bMid = new Date(baseline.getFullYear(), baseline.getMonth(), baseline.getDate());
  const nMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((nMid.getTime() - bMid.getTime()) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, diffDays);
  return Math.max(0, 100 - elapsed);
}

/** Mutates plain vehicle object: sets `healthPercentDisplay` when baseline mode applies. */
export function attachHealthPercentDisplay(vehicleObj) {
  if (!vehicleObj || typeof vehicleObj !== 'object') return vehicleObj;
  const pct = dailyDecayPercentFromBaseline(vehicleObj.healthPercentBaselineAt);
  if (pct != null) {
    vehicleObj.healthPercentDisplay = pct;
  } else if ('healthPercentDisplay' in vehicleObj) {
    delete vehicleObj.healthPercentDisplay;
  }
  return vehicleObj;
}

/** Plain booking payload with `vehicle.healthPercentDisplay` when populated. */
export function attachHealthPercentToBookingPayload(bookingLike) {
  if (!bookingLike || typeof bookingLike !== 'object') return bookingLike;
  const o =
    typeof bookingLike.toObject === 'function'
      ? bookingLike.toObject({ virtuals: true })
      : { ...bookingLike };
  if (o.vehicle && typeof o.vehicle === 'object') {
    attachHealthPercentDisplay(o.vehicle);
  }
  return o;
}
