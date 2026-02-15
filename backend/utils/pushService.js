import axios from 'axios';
import User from '../models/User.js';

export const sendPushToUser = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId).select('deviceTokens');
    if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
      return { sent: 0 };
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
      data,
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } },
    };

    const res = await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`,
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

