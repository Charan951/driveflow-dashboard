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
} from '../controllers/authController.js';

const router = express.Router();

router.post('/signup/prepare', prepareSignup);
router.post('/signup/send-otp', sendSignupOtp);
router.post('/signup/verify-otp', verifySignupOtp);
router.post('/login/prepare', prepareLogin);
router.post('/login/send-otp', sendLoginOtp);
router.post('/login/verify-otp', verifyLoginOtp);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
