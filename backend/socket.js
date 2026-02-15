import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

let io;

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
    socket.on('location', (data) => {
      // Only authenticated users can send location updates
      if (!socket.user) return;

      // Broadcast to 'admin' room
      io.to('admin').emit('liveLocation', {
        ...data,
        userId: socket.user._id, // Ensure trusted ID
        role: socket.user.role,
        name: socket.user.name
      });

      // If bookingId is present, broadcast to that specific booking room (for user/merchant tracking)
      if (data.bookingId) {
        io.to(`booking_${data.bookingId}`).emit('liveLocation', {
          ...data,
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
