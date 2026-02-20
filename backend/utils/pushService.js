import User from '../models/User.js';

export const sendPushToUser = async (userId, title, body, data = {}) => {
  const user = await User.findById(userId).select('_id');
  if (!user) {
    return { sent: 0, error: 'User not found' };
  }
  return { sent: 0 };
};
