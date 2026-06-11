import User from '../models/User.js';
import PendingSignup from '../models/PendingSignup.js';
import PendingLogin from '../models/PendingLogin.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailService.js';
import admin from '../config/firebase.js';
import generateToken from '../utils/generateToken.js';
import {
  normalizeIndianMobile,
  sendAuthOtp as msg91SendAuthOtp,
  verifySignupOtp as msg91VerifySignupOtp,
} from '../utils/msg91Service.js';
import { isTestingEnv } from '../utils/appEnvironment.js';
import { isValidEmail } from '../utils/validation.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;
const MAX_NAME_LENGTH = 50;
const MAX_PASSWORD_LENGTH = 15;

const isValidName = (value) => {
  const trimmed = value.trim();
  // Allow letters, spaces, apostrophes, hyphens only
  return /^[a-zA-Z][a-zA-Z\s'-]*$/.test(trimmed) && trimmed.length > 0;
};

const isNameTooLong = (value) => {
  return value.trim().length > MAX_NAME_LENGTH;
};

const OTP_PENDING_TTL_MS = 10 * 60 * 1000;

const buildAuthUserPayload = (user, extras = {}) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  subRole: user.subRole,
  phone: user.phone,
  isShopOpen: user.isShopOpen,
  location: user.location,
  addresses: user.addresses || [],
  address: user.location?.address || '',
  isOnline: user.isOnline,
  token: generateToken(user._id),
  ...extras,
});

const createUserFromPendingSignup = async (pending, mobile) => {
  const userExists = await User.findOne({ email: pending.email });
  if (userExists) {
    await PendingSignup.deleteOne({ mobile });
    throw new Error('User already exists');
  }

  const user = await User.create({
    name: pending.name,
    email: pending.email,
    password: pending.password,
    role: 'customer',
    phone: mobile.slice(2),
    isApproved: true,
  });

  await PendingSignup.deleteOne({ mobile });
  return user;
};

const formatChannelLabel = (channels = ['whatsapp']) => {
  if (channels.includes('whatsapp') && channels.includes('sms')) return 'WhatsApp and SMS';
  if (channels.includes('sms')) return 'SMS';
  return 'WhatsApp';
};

const resolveUserMobile = (user) => {
  const raw = user?.phone;
  if (!raw) return null;
  return normalizeIndianMobile(raw);
};

/** Step 1 — validate signup fields, store pending session (no OTP yet). */
export const prepareSignup = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Please enter your full name' });
    }
    if (isNameTooLong(name)) {
      return res.status(400).json({ message: 'Too long data not accept' });
    }
    if (!isValidName(name)) {
      return res.status(400).json({ message: 'Please enter a valid full name (must contain letters only with spaces, apostrophes, or hyphens)' });
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Too long data not accept' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailValidation = isValidEmail(normalizedEmail);
    
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.error || 'Invalid email id' });
    }
    const mobile = normalizeIndianMobile(phone);

    if (!mobile) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const phoneTaken = await User.findOne({
      $or: [{ phone }, { phone: mobile }, { phone: mobile.slice(2) }],
    });
    if (phoneTaken) {
      return res.status(400).json({ message: 'Phone number is already registered' });
    }

    const expiresAt = new Date(Date.now() + OTP_PENDING_TTL_MS);
    await PendingSignup.findOneAndUpdate(
      { mobile },
      {
        mobile,
        name: name.trim(),
        email: normalizedEmail,
        password,
        expiresAt,
        otpHash: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (isTestingEnv()) {
      const pending = await PendingSignup.findOne({ mobile });
      const user = await createUserFromPendingSignup(pending, mobile);
      return res.status(201).json(
        buildAuthUserPayload(user, {
          skipOtp: true,
          message: 'Account created (testing — OTP skipped).',
        })
      );
    }

    res.json({
      message: 'Details verified. Continue to OTP verification.',
      mobile: `******${mobile.slice(-4)}`,
      verified: true,
    });
  } catch (error) {
    console.error('prepareSignup error:', error.message);
    res.status(500).json({ message: error.message || 'Could not verify signup details' });
  }
};

/** Step 2 — send WhatsApp OTP (template: user_authentication). */
export const sendSignupOtp = async (req, res) => {
  const { phone } = req.body;

  try {
    if (!phone?.trim()) {
      return res.status(400).json({ message: 'Phone is required' });
    }

    const mobile = normalizeIndianMobile(phone);
    if (!mobile) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number' });
    }

    const pending = await PendingSignup.findOne({ mobile });
    if (!pending) {
      return res.status(400).json({ message: 'Please complete signup details first' });
    }

    if (pending.expiresAt < new Date()) {
      await PendingSignup.deleteOne({ mobile });
      return res.status(400).json({ message: 'Session expired. Please start signup again.' });
    }

    const sendResult = await msg91SendAuthOtp(mobile);
    pending.otpHash = sendResult.otpHash || null;
    await pending.save();

    const channels = sendResult.channels || ['whatsapp'];
    res.json({
      message: isTestingEnv()
        ? 'OTP generated for testing (WhatsApp/SMS disabled). Check server logs.'
        : `OTP sent to your ${formatChannelLabel(channels)}`,
      mobile: `******${mobile.slice(-4)}`,
      channels,
    });
  } catch (error) {
    console.error('sendSignupOtp error:', error.message);
    res.status(500).json({
      message: error.message || 'Failed to send OTP. Please try again.',
    });
  }
};

export const verifySignupOtp = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    if (!phone?.trim()) {
      return res.status(400).json({ message: 'Phone is required' });
    }
    if (!isTestingEnv() && !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const mobile = normalizeIndianMobile(phone);
    if (!mobile) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number' });
    }

    const pending = await PendingSignup.findOne({ mobile });
    if (!pending) {
      return res.status(400).json({ message: 'No signup in progress. Please request a new OTP.' });
    }

    if (pending.expiresAt < new Date()) {
      await PendingSignup.deleteOne({ mobile });
      return res.status(400).json({ message: 'OTP session expired. Please request a new OTP.' });
    }

    if (!isTestingEnv()) {
      await msg91VerifySignupOtp(mobile, otp, pending);
    }

    const user = await createUserFromPendingSignup(pending, mobile);

    res.status(201).json(buildAuthUserPayload(user));
  } catch (error) {
    console.error('verifySignupOtp error:', error.message);
    const status = error.message?.includes('Invalid') || error.message?.includes('expired') ? 400 : 500;
    res.status(status).json({
      message: error.message || 'OTP verification failed',
    });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'customer',
      phone,
      isApproved: true,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        phone: user.phone,
        addresses: user.addresses || [],
        location: user.location,
        address: user.location?.address || '',
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Step 1 — verify email/password, prepare OTP session (no OTP yet). */
export const prepareLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Too long data not accept' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailValidation = isValidEmail(normalizedEmail);
    
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.error || 'Invalid email id' });
    }
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    if (!user.isApproved) {
      return res.status(401).json({ message: 'Account pending approval. Please wait for admin approval.' });
    }

    if (user.role === 'admin' || isTestingEnv()) {
      return res.json(buildAuthUserPayload(user, { skipOtp: true }));
    }

    const mobile = resolveUserMobile(user);
    if (!mobile) {
      return res.status(400).json({
        message: 'No WhatsApp number on your account. Contact support or update your profile phone number.',
      });
    }

    const expiresAt = new Date(Date.now() + OTP_PENDING_TTL_MS);
    await PendingLogin.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        userId: user._id,
        mobile,
        expiresAt,
        otpHash: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: 'Credentials verified. Continue to OTP verification.',
      mobile: `******${mobile.slice(-4)}`,
      verified: true,
    });
  } catch (error) {
    console.error('prepareLogin error:', error.message);
    res.status(500).json({ message: error.message || 'Could not verify login' });
  }
};

/** Step 2 — send login OTP via WhatsApp (user_authentication template). */
export const sendLoginOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pending = await PendingLogin.findOne({ email: normalizedEmail });

    if (!pending) {
      return res.status(400).json({ message: 'Please sign in with email and password first' });
    }

    if (pending.expiresAt < new Date()) {
      await PendingLogin.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ message: 'Session expired. Please sign in again.' });
    }

    const sendResult = await msg91SendAuthOtp(pending.mobile);
    pending.otpHash = sendResult.otpHash || null;
    await pending.save();

    const channels = sendResult.channels || ['whatsapp'];
    res.json({
      message: isTestingEnv()
        ? 'OTP generated for testing (WhatsApp/SMS disabled). Check server logs.'
        : `OTP sent to your ${formatChannelLabel(channels)}`,
      mobile: `******${pending.mobile.slice(-4)}`,
      channels,
    });
  } catch (error) {
    console.error('sendLoginOtp error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to send OTP' });
  }
};

/** Step 3 — verify OTP and issue session token. */
export const verifyLoginOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!isTestingEnv() && !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pending = await PendingLogin.findOne({ email: normalizedEmail });

    if (!pending) {
      return res.status(400).json({ message: 'Please sign in with email and password first' });
    }

    if (pending.expiresAt < new Date()) {
      await PendingLogin.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ message: 'OTP session expired. Please sign in again.' });
    }

    if (!isTestingEnv()) {
      await msg91VerifySignupOtp(pending.mobile, otp, pending);
    }

    const user = await User.findById(pending.userId);
    if (!user) {
      await PendingLogin.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ message: 'User not found' });
    }

    await PendingLogin.deleteOne({ email: normalizedEmail });

    res.json(buildAuthUserPayload(user));
  } catch (error) {
    console.error('verifyLoginOtp error:', error.message);
    const status = error.message?.includes('Invalid') || error.message?.includes('expired') ? 400 : 500;
    res.status(status).json({ message: error.message || 'OTP verification failed' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (user && (await user.matchPassword(password))) {
      if (!user.isApproved) {
        return res.status(401).json({ message: 'Account pending approval. Please wait for admin approval.' });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        phone: user.phone,
        isShopOpen: user.isShopOpen,
        location: user.location,
        addresses: user.addresses || [],
        address: user.location?.address || '',
        isOnline: user.isOnline,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const googleLogin = async (req, res) => {
  const { idToken, signupIfMissing } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;
    const normalizedEmail = email.toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      if (signupIfMissing) {
        return res.status(404).json({
          code: 'GOOGLE_ACCOUNT_NOT_FOUND',
          message: 'No account found for this Google email. Please sign up.',
          email: normalizedEmail,
          name: name || '',
          avatar: picture || '',
        });
      }

      user = await User.create({
        name,
        email: normalizedEmail,
        password: crypto.randomBytes(16).toString('hex'),
        role: 'customer',
        isApproved: true,
        avatar: picture,
      });
    }

    if (!user.isApproved) {
      return res.status(401).json({ 
        message: 'Account pending approval. Please wait for admin approval.',
        code: 'PENDING_APPROVAL' 
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subRole: user.subRole,
      phone: user.phone,
      isShopOpen: user.isShopOpen,
      location: user.location,
      addresses: user.addresses || [],
      address: user.location?.address || '',
      isOnline: user.isOnline,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Google login verification error:', error);
    res.status(401).json({ message: 'Invalid Google token' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const subject = 'Password Reset Request';
    const text = `You requested a password reset. Visit this link to set a new password: ${resetUrl}. If you did not request this, you can ignore this email.`;
    const html = `<p>You requested a password reset for your Vehicle Management System account.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`;

    await sendEmail(email, subject, text, html);

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { token, email, password } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
