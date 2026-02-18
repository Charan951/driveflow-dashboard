import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Booking from './models/Booking.js';

let io;

// Cache to avoid frequent DB lookups when deriving active booking for a staff user
// Map<userId, { bookingId: string, updatedAt: number }>
const activeBookingCache = new Map();

export const initSocket = (server) => {
  const allowedOrigins = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',')
    : [];
  const isDev = process.env.NODE_ENV !== 'production';
  const devOriginPrefixes = ['http://localhost:', 'http://127.0.0.1:', 'http://0.0.0.0:'];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.trim();
        const allowedByEnv =
          allowedOrigins.includes('*') || allowedOrigins.includes(normalized);
        const allowedByDevDefault =
          isDev && devOriginPrefixes.some((p) => normalized.startsWith(p));

        if (allowedByEnv || allowedByDevDefault) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS (socket.io)'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = await User.findById(decoded.id).select('-password');
      }
      next();
    } catch (error) {
      console.error('Socket Auth Error:', error.message);
      // We allow connection even if auth fails, but they won't have socket.user
      // Or we can strict reject: next(new Error('Authentication error'));
      // For now, let's allow but they can't do privileged actions
      next(); 
    }
  });

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id} (User: ${socket.user?.name || 'Guest'})`);

    // Join a specific room
    socket.on('join', (room) => {
      // Security check for admin room
      if (room === 'admin') {
        if (socket.user?.role !== 'admin') {
          console.log(`Unauthorized join attempt to 'admin' room by ${socket.user?.name || 'Guest'}`);
          return;
        }
      }
      
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // Leave a room
    socket.on('leave', (room) => {
      socket.leave(room);
      console.log(`Socket ${socket.id} left room ${room}`);
    });

    // Handle live location updates
    socket.on('location', async (data) => {
      // Only authenticated users can send location updates
      if (!socket.user) return;

      const userId = String(socket.user._id);
      const now = Date.now();

      // Broadcast to 'admin' room
      io.to('admin').emit('liveLocation', {
        ...data,
        userId: socket.user._id, // Ensure trusted ID
        role: socket.user.role,
        name: socket.user.name
      });

      // Derive effective bookingId:
      // 1) Prefer explicit bookingId from client
      // 2) Fallback to last cached active booking for this staff
      // 3) As a last resort, look up the latest active booking from DB (throttled)
      let bookingId = data.bookingId;

      if (!bookingId) {
        const cached = activeBookingCache.get(userId);
        const ttlMs = 30 * 1000;
        if (cached && now - cached.updatedAt < ttlMs) {
          bookingId = cached.bookingId;
        } else {
          try {
            const active = await Booking.findOne({
              $or: [
                { pickupDriver: socket.user._id },
                { technician: socket.user._id }
              ],
              status: {
                $in: [
                  'ASSIGNED',
                  'ACCEPTED',
                  'REACHED_CUSTOMER',
                  'VEHICLE_PICKED',
                  'REACHED_MERCHANT',
                  'OUT_FOR_DELIVERY'
                ]
              }
            })
              .sort({ updatedAt: -1 })
              .select('_id')
              .lean();

            if (active?._id) {
              bookingId = String(active._id);
              activeBookingCache.set(userId, { bookingId, updatedAt: now });
            } else {
              activeBookingCache.delete(userId);
            }
          } catch (e) {
            console.error('Socket location booking lookup failed:', e.message);
          }
        }
      }

      // If we resolved a bookingId, broadcast to that specific booking room
      if (bookingId) {
        io.to(`booking_${bookingId}`).emit('liveLocation', {
          ...data,
          bookingId,
          userId: socket.user._id,
          role: socket.user.role,
          name: socket.user.name
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
