import admin from '../config/firebase.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';

/** Roles that use mobile (customer) or staff apps — device push disabled by default; in-app + history kept. */
const SKIP_FCM_ROLES = new Set(['customer', 'staff']);

/**
 * Customer (mobile) notification types that still send device push (FCM).
 * Add new mobile notifications here one-by-one as they are approved.
 */
export const CUSTOMER_MOBILE_FCM_TYPES = new Set([
  'staff_reached_location',
  'service_started',
  'merchant_approval',
  'service_completed_payment_pending',
  'delivery_otp',
  'feedback',
]);

const shouldSkipFcmForRole = (role) =>
  SKIP_FCM_ROLES.has(String(role || '').toLowerCase());

const shouldSendFcmToUser = (user, type) => {
  const role = String(user?.role || '').toLowerCase();
  if (!shouldSkipFcmForRole(role)) return true;
  if (role === 'customer') return CUSTOMER_MOBILE_FCM_TYPES.has(type);
  return false;
};

/** FCM data payloads must use string values only. */
const fcmStringData = (data) =>
  Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v == null ? '' : String(v)])
  );

const emitNotificationSocket = (userId, notification) => {
  try {
    const io = getIO();
    if (io && userId) {
      io.to(`user_${userId}`).emit('notification', notification);
    }
  } catch {
    // Socket notification emit error
  }
};

/**
 * Send push notification to a single user
 * @param {string} userId - ID of the recipient user
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data payload
 * @param {string} type - Notification type (order, support, etc.)
 * @returns {Promise<object>} - Result of the operation
 */
export const sendPushToUser = async (
  userId,
  title,
  body,
  data = {},
  type = 'general',
  options = {}
) => {
  try {
    const user = await User.findById(userId);
    const fcmDataType = data?.type || type;

    const notification = await Notification.create({
      userId,
      role: user ? user.role : 'all',
      title,
      body,
      data,
      type,
    });

    emitNotificationSocket(userId, notification);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!shouldSendFcmToUser(user, fcmDataType)) {
      return {
        success: true,
        skippedFcm: true,
        message: 'In-app notification saved; device push disabled for this role',
      };
    }

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: false, message: 'User has no FCM tokens' };
    }

    const tokens = user.fcmTokens.map((t) => t.token);
    const channelId =
      fcmDataType === 'merchant_approval'
        ? 'merchant_approval_channel'
        : fcmDataType === 'service_completed_payment_pending'
          ? 'payment_pending_channel'
          : 'high_importance_channel';
    const message = {
      ...(options.dataOnly ? {} : { notification: { title, body } }),
      data: fcmStringData({
        ...data,
        title,
        body,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      }),
      tokens,
      android: options.dataOnly
        ? { priority: 'high' }
        : {
            priority: 'high',
            notification: {
              channelId,
              sound: 'default',
            },
          },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            ...(options.dataOnly ? {} : { sound: 'default' }),
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { token: { $in: invalidTokens } } },
        });
      }
    }

    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to all users of a specific role
 * @param {string} role - Role to target (customer, staff, merchant)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data payload
 */
export const sendPushToRole = async (role, title, body, data = {}, type = 'general') => {
  try {
    await Notification.create({
      role,
      title,
      body,
      data,
      type,
    });

    if (shouldSkipFcmForRole(role)) {
      return {
        success: true,
        skippedFcm: true,
        message: 'In-app notification saved; device push disabled for this role',
      };
    }

    const users = await User.find({ role, 'fcmTokens.0': { $exists: true } });
    const tokens = users.flatMap((u) => u.fcmTokens.map((t) => t.token));

    if (tokens.length > 0) {
      const message = {
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        tokens,
        android: {
          priority: 'high',
          notification: {
            channelId: 'high_importance_channel',
            sound: 'default',
          },
        },
      };

      const chunkSize = 500;
      const tokenChunks = [];
      for (let i = 0; i < tokens.length; i += chunkSize) {
        tokenChunks.push(tokens.slice(i, i + chunkSize));
      }

      await Promise.all(
        tokenChunks.map((chunk) =>
          admin.messaging().sendEachForMulticast({ ...message, tokens: chunk })
        )
      );
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to a specific topic
 * @param {string} topic - Topic name
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data payload
 */
export const sendPushToTopic = async (topic, title, body, data = {}, type = 'general') => {
  try {
    await Notification.create({
      role: topic,
      title,
      body,
      data,
      type,
    });

    // Topics like all_users include mobile/staff subscribers — skip device push.
    return {
      success: true,
      skippedFcm: true,
      message: 'In-app notification saved; topic device push disabled',
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * High-priority data-only push (no DB notification row). Used for live
 * tracking updates so the client can refresh one notification in place.
 */
export const sendSilentPush = async (userId, data = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user || shouldSkipFcmForRole(user.role)) return;
    if (!user.fcmTokens || user.fcmTokens.length === 0) return;

    const tokens = user.fcmTokens.map((t) => t.token);
    const message = {
      data: fcmStringData({ ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' }),
      tokens,
      android: { priority: 'high' },
      apns: {
        payload: {
          aps: { contentAvailable: true },
        },
      },
    };

    await admin.messaging().sendEachForMulticast(message);
  } catch {
    // Silent push error
  }
};
