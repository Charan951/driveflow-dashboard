import axios from 'axios';
import fs from 'fs';
import admin from 'firebase-admin';
import User from '../models/User.js';

let firebaseMessaging = null;

const initFirebaseAdmin = () => {
  if (firebaseMessaging) return firebaseMessaging;
  try {
    const keyPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!keyPath) {
      return null;
    }
    const raw = fs.readFileSync(keyPath, 'utf8');
    const serviceAccount = JSON.parse(raw);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    firebaseMessaging = admin.messaging();
    return firebaseMessaging;
  } catch {
    return null;
  }
};

const normalizeData = (data) => {
  const result = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      result[key] = '';
    } else {
      result[key] = String(value);
    }
  });
  return result;
};

export const sendPushToUser = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId).select('deviceTokens');
    if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
      return { sent: 0 };
    }

    const messaging = initFirebaseAdmin();
    const normalizedData = normalizeData(data);

    if (messaging) {
      const message = {
        tokens: user.deviceTokens,
        notification: {
          title,
          body,
        },
        data: normalizedData,
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
      };
      try {
        const res = await messaging.sendEachForMulticast(message);
        return { sent: res.successCount, response: res.responses };
      } catch (e) {
        return { sent: 0, error: e.message };
      }
    }

    const serverKey = process.env.FCM_SERVER_KEY;
    if (!serverKey) {
      return { sent: 0 };
    }

    const payload = {
      registration_ids: user.deviceTokens,
      notification: {
        title,
        body,
        sound: 'default',
      },
      data: normalizedData,
      priority: 'high',
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } },
    };

    const res = await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      timeout: 10000,
    });

    return { sent: res.data.success || 0, response: res.data };
  } catch (e) {
    return { sent: 0, error: e.message };
  }
};

export const addDeviceToken = async (userId, token) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  user.deviceTokens = Array.from(new Set([...(user.deviceTokens || []), token]));
  await user.save();
  return user.deviceTokens;
};

export const removeDeviceToken = async (userId, token) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  user.deviceTokens = (user.deviceTokens || []).filter(t => t !== token);
  await user.save();
  return user.deviceTokens;
};
