import jwt from 'jsonwebtoken';

/**
 * Native apps (mobile/staff) keep the user logged in indefinitely — the
 * token is stored in secure local storage and only ever invalidated by an
 * explicit logout (which bumps the user's tokenVersion, see authController).
 * Web sessions are bounded to 90 days regardless of activity.
 */
const NON_EXPIRING_PLATFORMS = new Set(['mobile', 'staff']);
// Shared with authCookie.js so the web session cookie's max-age can never
// drift out of sync with the JWT's own expiry.
export const WEB_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '90d';

const generateToken = (id, role, tokenVersion = 0, platform) => {
  const payload = { id };
  if (role) {
    payload.role = role;
  }
  if (tokenVersion) {
    payload.tokenVersion = tokenVersion;
  }

  if (NON_EXPIRING_PLATFORMS.has(platform)) {
    return jwt.sign(payload, process.env.JWT_SECRET);
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: WEB_EXPIRES_IN,
  });
};

export default generateToken;
