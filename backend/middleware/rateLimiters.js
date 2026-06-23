import rateLimit from 'express-rate-limit';

const standardHandler = (message) => ({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message },
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
});

export const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions. Please try again later.' },
});

export const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many upload requests. Please try again later.' },
});
