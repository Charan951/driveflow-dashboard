import { getIO } from '../socket.js';

/**
 * Utility to emit real-time synchronization events across all platforms
 */
export const emitEntitySync = (entityName, action, data) => {
  try {
    const io = getIO();
    const eventName = `sync:${entityName}`;
    const payload = {
      entity: entityName,
      action, // 'created', 'updated', 'deleted'
      data,
      timestamp: new Date().toISOString()
    };

    // 1. Always notify admins
    io.to('admin').emit(eventName, payload);
    io.to('admin').emit('global:sync', payload);

    // 2. Notify specific user if data contains userId or user object
    const userId = data.userId || (data.user && (data.user._id || data.user));
    if (userId) {
      io.to(`user_${userId.toString()}`).emit(eventName, payload);
      io.to(`user_${userId.toString()}`).emit('global:sync', payload);
    }

    // 3. Notify merchant if data contains merchantId or merchant object
    const merchantId = data.merchantId || (data.merchant && (data.merchant._id || data.merchant));
    if (merchantId) {
      io.to(`user_${merchantId.toString()}`).emit(eventName, payload);
      io.to(`user_${merchantId.toString()}`).emit('global:sync', payload);
    }

    // 4. Notify staff if data contains staffId or staff object
    const staffId = data.staffId || data.pickupDriver || data.technician;
    if (staffId) {
      const id = staffId._id || staffId;
      io.to(`user_${id.toString()}`).emit(eventName, payload);
      io.to(`user_${id.toString()}`).emit('global:sync', payload);
    }

    // 5. Notify role-based rooms if applicable
    if (data.role) {
      io.to(data.role.toLowerCase()).emit(eventName, payload);
      io.to(data.role.toLowerCase()).emit('global:sync', payload);
    }

    // 6. Special case for bookings: notify the booking-specific room
    const bookingId = data.bookingId || (entityName === 'booking' ? data._id : null);
    if (bookingId) {
      io.to(`booking_${bookingId.toString()}`).emit(eventName, payload);
      io.to(`booking_${bookingId.toString()}`).emit('global:sync', payload);
    }

    console.log(`[Sync] Emitted ${action} for ${entityName}`);
  } catch (err) {
    console.error(`[Sync Error] Failed to emit sync event for ${entityName}:`, err.message);
  }
};
