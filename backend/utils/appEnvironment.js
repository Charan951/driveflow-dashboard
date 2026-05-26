const VALID_APP_ENVS = ['development', 'testing', 'production'];

/**
 * Application environment for backend behavior (separate from NODE_ENV build mode).
 * - development | production: full MSG91 WhatsApp/SMS OTP delivery
 * - testing: OTP generated locally only; no WhatsApp/SMS sends
 */
export const getAppEnv = () => {
  const raw = String(process.env.APP_ENV || '').trim().toLowerCase();
  if (VALID_APP_ENVS.includes(raw)) {
    return raw;
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
};

export const isTestingEnv = () => getAppEnv() === 'testing';

export const isOtpExternalDeliveryEnabled = () => !isTestingEnv();
