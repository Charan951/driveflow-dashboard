import express from 'express';
import {
  registerUser,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword,
  prepareSignup,
  sendSignupOtp,
  verifySignupOtp,
  prepareLogin,
  sendLoginOtp,
  verifyLoginOtp,
  logoutUser,
  getSession,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  rejectPrivilegedAuthFields,
  blockLegacyAuthInProduction,
} from '../middleware/authBodySanitizer.js';
import {
  signupPrepareLimiter,
  signupOtpLimiter,
  loginPrepareLimiter,
  loginOtpLimiter,
  forgotPasswordLimiter,
} from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/signup/prepare', signupPrepareLimiter, rejectPrivilegedAuthFields, prepareSignup);
router.post('/signup/send-otp', signupOtpLimiter, rejectPrivilegedAuthFields, sendSignupOtp);
router.post('/signup/verify-otp', signupOtpLimiter, rejectPrivilegedAuthFields, verifySignupOtp);
router.post('/login/prepare', loginPrepareLimiter, rejectPrivilegedAuthFields, prepareLogin);
router.post('/login/send-otp', loginOtpLimiter, rejectPrivilegedAuthFields, sendLoginOtp);
router.post('/login/verify-otp', loginOtpLimiter, rejectPrivilegedAuthFields, verifyLoginOtp);
router.post('/register', blockLegacyAuthInProduction, rejectPrivilegedAuthFields, registerUser);
router.post('/login', blockLegacyAuthInProduction, rejectPrivilegedAuthFields, loginUser);
router.post('/google', rejectPrivilegedAuthFields, googleLogin);
router.post('/forgot-password', forgotPasswordLimiter, rejectPrivilegedAuthFields, forgotPassword);
router.post('/reset-password', rejectPrivilegedAuthFields, resetPassword);
router.post('/logout', logoutUser);
router.get('/session', protect, getSession);

export default router;
