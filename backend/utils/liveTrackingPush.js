import { sendSilentPush } from './pushService.js';

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** bookingId -> { lastSent, lastDistance, baseline, phase } */
const liveState = new Map();

const PICKUP_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKUP_BATTERY_TIRE'];
const RETURN_STATUSES = ['OUT_FOR_DELIVERY'];

const THROTTLE_MS = 22_000;
const MIN_MOVE_M = 120;

export function clearLiveTrackingState(bookingId) {
  if (bookingId != null) liveState.delete(String(bookingId));
}

/**
 * Throttled live ETA push to the booking customer while staff is en route.
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.bookingId
 * @param {string} params.staffId
 * @param {number} params.staffLat
 * @param {number} params.staffLng
 * @param {object} params.bookingLean — .user .status .location .pickupDriver .technician .carWash
 */
export async function trySendLiveTrackingPush({
  bookingId,
  staffId,
  staffLat,
  staffLng,
  bookingLean: b,
  force = false,
}) {
  if (!b?.user || !b.location?.lat || !b.location?.lng) return;

  const sid = String(staffId);
  const assigned =
    (b.pickupDriver && String(b.pickupDriver) === sid) ||
    (b.technician && String(b.technician) === sid) ||
    (b.carWash?.staffAssigned && String(b.carWash.staffAssigned) === sid);
  if (!assigned) return;

  const st = (b.status || '').toUpperCase();
  let phase = null;
  if (PICKUP_STATUSES.includes(st)) phase = 'pickup';
  else if (RETURN_STATUSES.includes(st)) phase = 'return';
  else {
    clearLiveTrackingState(bookingId);
    return;
  }

  const d = haversineMeters(
    staffLat,
    staffLng,
    b.location.lat,
    b.location.lng
  );
  const distanceM = Math.max(0, Math.round(d));
  const id = String(bookingId);

  let s = liveState.get(id);
  const now = Date.now();
  if (!s || s.phase !== phase) {
    s = { phase, baseline: null, lastSent: 0, lastDistance: null };
  }

  if (
    !force &&
    s.lastSent &&
    now - s.lastSent < THROTTLE_MS &&
    (s.lastDistance == null ||
      Math.abs(distanceM - s.lastDistance) < MIN_MOVE_M)
  ) {
    return;
  }

  if (s.baseline == null || distanceM > s.baseline) {
    s.baseline = Math.max(distanceM, 400);
  }
  const progress = Math.min(
    100,
    Math.max(0, Math.round((1 - distanceM / s.baseline) * 100))
  );

  s.lastSent = now;
  s.lastDistance = distanceM;
  liveState.set(id, s);

  const km = (distanceM / 1000).toFixed(distanceM >= 10000 ? 0 : 1);
  const title =
    phase === 'pickup' ? 'Staff is on the way' : 'Vehicle is returning';
  const body =
    distanceM < 60
      ? 'Almost there'
      : `About ${km} km away`;

  const userId = b.user._id ? String(b.user._id) : String(b.user);

  await sendSilentPush(userId, {
    type: 'live_tracking',
    bookingId: id,
    phase,
    distanceMeters: String(distanceM),
    progress: String(progress),
    title,
    body,
  });
}

/**
 * First ETA ping when a job is assigned, using the staff user's last known
 * coordinates (so the customer sees a tracking tile before the next GPS tick).
 */
export async function trySendLiveTrackingAssignmentSeed(bookingDoc) {
  try {
    if (!bookingDoc) return;
    const status = (bookingDoc.status || '').toUpperCase();
    if (!['ASSIGNED', 'ACCEPTED'].includes(status)) return;

    const pid = bookingDoc.pickupDriver;
    const tid = bookingDoc.technician;
    const cw = bookingDoc.carWash?.staffAssigned;
    const staffRef = pid || tid || cw;
    if (!staffRef) return;

    const staffId = staffRef._id ? String(staffRef._id) : String(staffRef);
    const User = (await import('../models/User.js')).default;
    const staff = await User.findById(staffId).select('location').lean();
    if (!staff?.location?.lat || !staff?.location?.lng) return;

    const userRef = bookingDoc.user;
    const userId = userRef?._id ? String(userRef._id) : userRef ? String(userRef) : null;
    if (!userId) return;

    const loc = bookingDoc.location;
    if (!loc?.lat || !loc?.lng) return;

    const pd = bookingDoc.pickupDriver
      ? String(bookingDoc.pickupDriver._id ?? bookingDoc.pickupDriver)
      : '';
    const td = bookingDoc.technician
      ? String(bookingDoc.technician._id ?? bookingDoc.technician)
      : '';
    const cws = bookingDoc.carWash?.staffAssigned
      ? String(
          bookingDoc.carWash.staffAssigned._id ??
            bookingDoc.carWash.staffAssigned
        )
      : '';

    const bookingLean = {
      user: { _id: userId },
      location: { lat: loc.lat, lng: loc.lng },
      status: bookingDoc.status,
      pickupDriver: pd || undefined,
      technician: td || undefined,
      carWash: cws ? { staffAssigned: cws } : undefined,
    };

    await trySendLiveTrackingPush({
      bookingId: bookingDoc._id,
      staffId,
      staffLat: staff.location.lat,
      staffLng: staff.location.lng,
      bookingLean,
      force: true,
    });
  } catch (_) {
    // optional seed
  }
}

/**
 * Tells the mobile app to remove the ongoing live-tracking notification.
 */
export async function sendLiveTrackingDismissPush(userId, bookingId) {
  clearLiveTrackingState(bookingId);
  if (!userId) return;
  await sendSilentPush(userId, {
    type: 'live_tracking_dismiss',
    bookingId: String(bookingId),
  });
}
