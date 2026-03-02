import admin from '../config/firebase.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

/**
 * Send push notification to a single user
 * @param {string} userId - ID of the recipient user
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data payload
 * @param {string} type - Notification type (order, support, etc.)
 * @returns {Promise<object>} - Result of the operation
 */
export const sendPushToUser = async (userId, title, body, data = {}, type = 'general') => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      // Save notification to history even if no tokens are found
      await Notification.create({
        userId,
        role: user ? user.role : 'all',
        title,
        body,
        data,
        type
      });
      return { success: false, message: 'User not found or has no FCM tokens' };
    }

    const tokens = user.fcmTokens.map(t => t.token);
    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      tokens,
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default'
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Handle invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          if (errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { token: { $in: invalidTokens } } }
        });
      }
    }

    // Save notification to history
    await Notification.create({
      userId,
      role: user.role,
      title,
      body,
      data,
      type
    });

    return { success: true, response };
  } catch (error) {
    console.error('Error sending push notification:', error);
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
    const users = await User.find({ role, 'fcmTokens.0': { $exists: true } });
    const tokens = users.flatMap(u => u.fcmTokens.map(t => t.token));

    if (tokens.length === 0) return { success: false, message: 'No tokens found for this role' };

    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      tokens,
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          sound: 'default'
        }
      }
    };

    // FCM has a limit of 500 tokens per multicast message
    const chunkSize = 500;
    const tokenChunks = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
      tokenChunks.push(tokens.slice(i, i + chunkSize));
    }

    const responses = await Promise.all(tokenChunks.map(chunk => 
      admin.messaging().sendEachForMulticast({ ...message, tokens: chunk })
    ));

    // Save one history record for the role broadcast
    await Notification.create({
      role,
      title,
      body,
      data,
      type
    });

    return { success: true, responses };
  } catch (error) {
    console.error('Error sending push to role:', error);
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
    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      topic,
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          sound: 'default'
        }
      }
    };

    const response = await admin.messaging().send(message);

    // Save history record
    await Notification.create({
      role: topic, // using role field for topic identifier
      title,
      body,
      data,
      type
    });

    return { success: true, response };
  } catch (error) {
    console.error('Error sending push to topic:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send silent data notification
 * @param {string} userId - Recipient ID
 * @param {object} data - Data payload
 */
export const sendSilentPush = async (userId, data = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

    const tokens = user.fcmTokens.map(t => t.token);
    const message = {
      data: { ...data, silent: 'true' },
      tokens,
      android: { priority: 'high' },
      apns: {
        payload: {
          aps: { contentAvailable: true }
        }
      }
    };

    await admin.messaging().sendEachForMulticast(message);
  } catch (error) {
    console.error('Error sending silent push:', error);
  }
};
