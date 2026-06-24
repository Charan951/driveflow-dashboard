import rateLimit from 'express-rate-limit';
import { getAppEnv } from '../utils/appEnvironment.js';

const standardHandler = (message) => ({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message },
  skip: () => getAppEnv() !== 'production',
});

export const signupPrepareLimiter = rateLimit({
  ...standardHandler('Too many signup attempts. Please try again later.'),
  max: 5,
});

export const signupOtpLimiter = rateLimit({
  ...standardHandler('Too many OTP requests. Please try again later.'),
  max: 5,
});

export const loginPrepareLimiter = rateLimit({
  ...standardHandler('Too many login attempts. Please try again later.'),
  max: 10,
});

export const loginOtpLimiter = rateLimit({
  ...standardHandler('Too many OTP requests. Please try again later.'),
  max: 10,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset requests. Please try again later.' },
  skip: () => getAppEnv() !== 'production',
});

export const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions. Please try again later.' },
  skip: () => getAppEnv() !== 'production',
});

export const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many upload requests. Please try again later.' },
  skip: () => getAppEnv() !== 'production',
});
