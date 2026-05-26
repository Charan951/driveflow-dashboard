import { getIO } from '../socket.js';

const ROLE_ROOMS = ['admin', 'staff', 'merchant', 'customer'];

/** Catalog / public config — broadcast to every connected socket. */
const BROADCAST_ALL_ENTITIES = new Set([
  'coupon',
  'slotBlock',
  'availableServicePincode',
  'service',
  'vehicle',
  'hero',
  'setting',
  'blog',
  'blogCategory',
  'career',
]);

const toIdString = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value._id != null) return String(value._id);
  return String(value);
};

const emitToRoom = (io, room, eventName, payload) => {
  if (!room) return;
  io.to(room).emit(eventName, payload);
};

const emitToRoles = (io, eventName, payload) => {
  for (const role of ROLE_ROOMS) {
    emitToRoom(io, role, eventName, payload);
  }
};

/**
 * Real-time sync for web, mobile, and staff apps.
 * Always emits `global:sync` + `sync:{entity}` to all role rooms, then targeted rooms.
 */
export const emitEntitySync = (entityName, action, data = {}) => {
  try {
    const io = getIO();
    const eventName = `sync:${entityName}`;
    const payload = {
      entity: entityName,
      action,
      data,
      timestamp: new Date().toISOString(),
    };

    // 1. Role-wide broadcast (all apps for admin / staff / merchant / customer)
    emitToRoles(io, eventName, payload);
    emitToRoles(io, 'global:sync', payload);

    // 2. Owning customer
    const userId = toIdString(
      data.userId || data.user?._id || data.user || data.customerId
    );
    if (userId) {
      emitToRoom(io, `user_${userId}`, eventName, payload);
      emitToRoom(io, `user_${userId}`, 'global:sync', payload);
    }

    // 3. Merchant on record
    const merchantId = toIdString(data.merchantId || data.merchant?._id || data.merchant);
    if (merchantId) {
      emitToRoom(io, `user_${merchantId}`, eventName, payload);
      emitToRoom(io, `user_${merchantId}`, 'global:sync', payload);
    }

    // 4. Assigned staff (pickup / technician / car wash)
    const staffIds = [
      data.staffId,
      data.pickupDriver,
      data.technician,
      data.carWash?.staffAssigned,
    ]
      .map(toIdString)
      .filter(Boolean);

    for (const staffId of [...new Set(staffIds)]) {
      emitToRoom(io, `user_${staffId}`, eventName, payload);
      emitToRoom(io, `user_${staffId}`, 'global:sync', payload);
    }

    // 5. Role on payload (e.g. new user created)
    if (data.role) {
      const roleRoom = String(data.role).toLowerCase();
      emitToRoom(io, roleRoom, eventName, payload);
      emitToRoom(io, roleRoom, 'global:sync', payload);
    }

    // 6. Booking room
    const bookingId = toIdString(
      data.bookingId || (entityName === 'booking' ? data._id : null)
    );
    if (bookingId) {
      emitToRoom(io, `booking_${bookingId}`, eventName, payload);
      emitToRoom(io, `booking_${bookingId}`, 'global:sync', payload);
    }

    // 7. Public catalog entities — every connected client
    if (BROADCAST_ALL_ENTITIES.has(entityName)) {
      io.emit(eventName, payload);
      io.emit('global:sync', payload);
    }
  } catch (err) {
    console.error(`[Sync Error] Failed to emit sync event for ${entityName}:`, err.message);
  }
};
