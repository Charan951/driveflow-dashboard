import crypto from 'crypto';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  return process.env.TRACKING_TOKEN_SECRET || process.env.JWT_SECRET;
}

export function createTrackingToken(bookingId, ttlMs = DEFAULT_TTL_MS) {
  const secret = getSecret();
  if (!secret) throw new Error('Tracking token secret is not configured');

  const expiresAt = Date.now() + ttlMs;
  const payload = `${bookingId}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function verifyTrackingToken(token) {
  const secret = getSecret();
  if (!secret || !token) return null;

  const parts = String(token).split('.');
  if (parts.length !== 3) return null;

  const [bookingId, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!bookingId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const payload = `${bookingId}.${expiresAt}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  return { bookingId, expiresAt };
}
