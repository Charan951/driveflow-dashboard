const COOKIE_NAME = 'carzzi_auth';

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export const getAccessMaxAgeMs = () => {
  const raw = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  const match = String(raw).match(/^(\d+)([smhd])$/i);
  if (!match) return 15 * 60_000;
  const n = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return n * (UNIT_MS[unit] || UNIT_MS.m);
};

export const isWebClient = (req) =>
  String(req.headers['x-client-platform'] || '').toLowerCase() === 'web';

export const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const [key, ...valueParts] = part.trim().split('=');
      return [key, decodeURIComponent(valueParts.join('='))];
    })
  );
};

const baseCookieOptions = () => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: getAccessMaxAgeMs(),
    path: '/',
  };
  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }
  return options;
};

export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, baseCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, baseCookieOptions());
};

export const getTokenFromRequest = (req) => {
  // Per-tab Bearer token (in-memory on web) must win over the shared httpOnly cookie
  // so different browser tabs can stay logged into different accounts.
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1];
  }

  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }

  return null;
};

export const getTokenFromSocketHandshake = (handshake) => {
  if (handshake.auth?.token) {
    return handshake.auth.token;
  }

  const cookies = parseCookies(handshake.headers?.cookie);
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];

  return null;
};
