/** Same calendar day as baseline → 100%; each following calendar day −1% (min 0). */
export function dailyDecayPercentFromBaseline(baselineAt: string | Date | null | undefined): number {
  if (!baselineAt) return 100;

  const baseline = new Date(baselineAt);
  const bMid = new Date(baseline.getFullYear(), baseline.getMonth(), baseline.getDate());
  const now = new Date();
  const nMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((nMid.getTime() - bMid.getTime()) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, diffDays);
  return Math.max(0, 100 - elapsed);
}

/**
 * Per-indicator remaining % when the vehicle has no `healthPercentBaselineAt` (legacy).
 * With Fixed KM / Fixed Days: 100% until lastServiceDate, then decays by interval usage.
 */
export function calculateRemainingHealthPercentLegacy(
  indicator:
    | {
        value?: number;
        fixedKm?: number;
        fixedDays?: number;
        lastServiceDate?: string | Date | null;
        lastServiceKm?: number;
      }
    | null
    | undefined,
  currentKm: number
): number {
  if (!indicator) return 0;

  const fixedKm = indicator.fixedKm || 0;
  const fixedDays = indicator.fixedDays || 0;

  if (fixedKm <= 0 && fixedDays <= 0) {
    return Math.round(Math.min(100, Math.max(0, indicator.value ?? 0)));
  }

  if (!indicator.lastServiceDate) {
    return 100;
  }

  const now = new Date();
  const lastDate = new Date(indicator.lastServiceDate);
  const lastDateMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = Math.abs(nowMidnight.getTime() - lastDateMidnight.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const lastKm = indicator.lastServiceKm || 0;
  const diffKm = Math.max(0, currentKm - lastKm);

  const usedFromDays = fixedDays > 0 ? Math.min(100, (diffDays / fixedDays) * 100) : 0;
  const usedFromKm = fixedKm > 0 ? Math.min(100, (diffKm / fixedKm) * 100) : 0;
  const usedPercent = Math.max(usedFromDays, usedFromKm);

  return Math.round(Math.max(0, 100 - usedPercent));
}

/** Unified display: baseline mode = same % for all indicators (−1%/day); otherwise legacy per row. */
export function calculateHealthDisplayPercent(
  indicator:
    | {
        value?: number;
        fixedKm?: number;
        fixedDays?: number;
        lastServiceDate?: string | Date | null;
        lastServiceKm?: number;
      }
    | null
    | undefined,
  currentKm: number,
  vehicleBaselineAt?: string | Date | null
): number {
  if (vehicleBaselineAt) {
    return dailyDecayPercentFromBaseline(vehicleBaselineAt);
  }
  return calculateRemainingHealthPercentLegacy(indicator, currentKm);
}
