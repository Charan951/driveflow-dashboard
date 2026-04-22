import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Booking from './models/Booking.js';
import Message from './models/Message.js';

let io;

// Cache to avoid frequent DB lookups when deriving active booking for a staff user
// Map<userId, { bookingId: string, updatedAt: number }>
const activeBookingCache = new Map();

export const initSocket = (server) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const devOriginPrefixes = ['http://localhost:', 'http://127.0.0.1:', 'http://0.0.0.0:'];

  const allowed = process.env.FRONTEND_URLS 
    ? process.env.FRONTEND_URLS.split(',').map(o => o.trim().toLowerCase().replace(/\/$/, "")) 
    : [];
  
  // Add defaults if not in .env
  if (!allowed.includes('http://localhost:8080')) {
    allowed.push('http://localhost:8080');
  }
  if (!allowed.includes('http://127.0.0.1:8080')) {
    allowed.push('http://127.0.0.1:8080');
  }
  if (!allowed.includes('https://car.speshwayhrms.com')) {
    allowed.push('https://car.speshwayhrms.com');
  }
  if (!allowed.includes('https://carb.speshwayhrms.com')) {
    allowed.push('https://carb.speshwayhrms.com');
  }
  if (!allowed.includes('https://api.carzzi.com')) {
    allowed.push('https://api.carzzi.com');
  }
  if (!allowed.includes('https://carzzi.com')) {
    allowed.push('https://carzzi.com');
  }

  io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: (origin, callback) => {
        // 1. Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const isDev = process.env.NODE_ENV !== 'production';
        const normalized = origin.trim().toLowerCase().replace(/\/$/, "");
        
        // 2. Explicitly allow local development origins (even in production)
        if (normalized.includes('localhost') || 
            normalized.includes('127.0.0.1') || 
            normalized.startsWith('http://192.168.') || 
            normalized.startsWith('http://10.')) {
          return callback(null, true);
        }

        // 3. In development mode, allow all origins
        if (isDev) {
          return callback(null, true);
        }

        // 4. In production, check against allowedOrigins
        if (allowed.includes('*') || allowed.includes(normalized)) {
          return callback(null, true);
        }

        
        callback(null, false);
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
      
      // We allow connection even if auth fails, but they won't have socket.user
      // Or we can strict reject: next(new Error('Authentication error'));
      // For now, let's allow but they can't do privileged actions
      next(); 
    }
  });

  io.on('connection', (socket) => {
    const transport = socket.conn.transport.name; // websocket or polling
    console.log(`[Socket] New connection: ${socket.id} (IP: ${socket.handshake.address}, Transport: ${transport})`);

    socket.on('error', (err) => {
      console.error(`[Socket Error] from client ${socket.id}:`, err);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket Disconnected] client ${socket.id}: ${reason}`);
    });

    if (socket.user) {
      const userId = socket.user._id.toString();
      const userRole = socket.user.role?.toLowerCase();

      // Join private user room
      socket.join(`user_${userId}`);
      console.log(`[Socket] User ${userId} (${userRole}) joined their private room.`);

      // Automatically join role-based rooms
      if (userRole) {
        socket.join(userRole);
        console.log(`[Socket] User ${userId} joined global role room: ${userRole}`);
      }
    }

    // Join a specific room
    socket.on('join', (room) => {
      if (!room) return;
      console.log(`[Socket] ${socket.id} (User: ${socket.user?._id || 'unauthenticated'}) joining room: ${room}`);
      
      // Security check for admin room
      if (room === 'admin') {
        if (socket.user?.role?.toLowerCase() !== 'admin') {
          console.warn(`Unauthorized admin room join attempt from user ${socket.user?._id} with role ${socket.user?.role}`);
          return;
        }
        console.log(`Admin user ${socket.user?._id} joined admin room`);
      }
      
      socket.join(room);

      // Join role-specific sub-room for chat isolation
      if (typeof room === 'string' && room.startsWith('booking_') && socket.user) {
        const userRole = socket.user.role?.toLowerCase();
        if (userRole === 'customer') {
          socket.join(`${room}_customer`);
        } else if (userRole === 'merchant') {
          // Merchants join both rooms to talk to customers and staff
          socket.join(`${room}_customer`);
          socket.join(`${room}_merchant`);
        } else if (userRole === 'staff') {
          // Drivers/technicians join both internal merchant room and general booking room
          socket.join(`${room}_merchant`);
          socket.join(`${room}_customer`); // Allow staff to see customer chat too
        } else if (userRole === 'admin') {
          socket.join(`${room}_customer`);
          socket.join(`${room}_merchant`);
        }
      }
      
      (async () => {
        try {
          if (typeof room === 'string' && room.startsWith('booking_')) {
            const bookingId = room.replace('booking_', '');
            const booking = await Booking.findById(bookingId).select('pickupDriver technician status').lean();
            const staffId = booking?.pickupDriver || booking?.technician;
            if (staffId) {
              const staff = await User.findById(staffId).select('name role location').lean();
              const lat = staff?.location?.lat;
              const lng = staff?.location?.lng;
              if (typeof lat === 'number' && typeof lng === 'number') {
                socket.emit('liveLocation', {
                  bookingId: bookingId,
                  userId: staffId,
                  role: staff?.role || 'staff',
                  name: staff?.name,
                  lat,
                  lng,
                  updatedAt: staff?.location?.updatedAt || new Date()
                });
              }
            }
          } else if (room === 'admin') {
            const staffList = await User.find({
              $or: [
                { role: 'staff' },
                { role: 'admin', isOnline: true }
              ],
              status: { $ne: 'Inactive' },
              'location.lat': { $exists: true }
            }).select('name role subRole location isOnline lastSeen').lean();
            for (const s of staffList) {
              const lat = s?.location?.lat;
              const lng = s?.location?.lng;
              if (typeof lat === 'number' && typeof lng === 'number') {
                socket.emit('liveLocation', {
                  userId: s._id,
                  role: s.role || 'staff',
                  subRole: s.subRole,
                  name: s.name,
                  lat,
                  lng,
                  isOnline: s.isOnline !== false,
                  lastSeen: s.lastSeen,
                  updatedAt: s?.location?.updatedAt || new Date(),
                  timestamp: s?.location?.updatedAt || new Date().toISOString() // Both for compatibility
                });
              }
            }
          }
        } catch (e) {
          
        }
      })();
    });

    // Leave a room
    socket.on('leave', (room) => {
      socket.leave(room);
      
    });

    // Handle live location updates
    socket.on('location', async (data) => {
      // Only authenticated users can send location updates
      if (!socket.user) return;

      const userId = String(socket.user._id);
      const now = Date.now();

      // Update isOnline status and location in DB
      try {
        // Fetch fresh user to avoid overwriting newer location data from REST with stale socket.user.location
        const freshUser = await User.findById(socket.user._id);
        if (!freshUser) return;

        const updateData = { 
          isOnline: true, 
          lastSeen: now 
        };

        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          updateData.location = {
            ...freshUser.location,
            lat: data.lat,
            lng: data.lng,
            updatedAt: now
          };
          updateData.geo = {
            type: 'Point',
            coordinates: [data.lng, data.lat]
          };
        }

        await User.findByIdAndUpdate(socket.user._id, updateData);
        
        // Update local socket.user cache
        socket.user.isOnline = true;
        socket.user.lastSeen = now;
        if (updateData.location) socket.user.location = updateData.location;

        // Emit status update to admin if online status just changed or after a while
        if (!freshUser.isOnline || (freshUser.lastSeen && now - freshUser.lastSeen > 60000)) {
          io.to('admin').emit('userStatusUpdate', {
            userId: socket.user._id,
            isOnline: true,
            lastSeen: now
          });
        }
      } catch (e) {
        
      }

      // Broadcast to 'admin' room
      io.to('admin').emit('liveLocation', {
        ...data,
        userId: socket.user._id,
        role: socket.user.role,
        subRole: socket.user.subRole,
        name: socket.user.name,
        isOnline: true,
        timestamp: new Date().toISOString() // Ensure timestamp is sent
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
                  'SERVICE_STARTED',
                  'SERVICE_COMPLETED',
                  'OUT_FOR_DELIVERY',
                  'STAFF_REACHED_MERCHANT',
                  'PICKUP_BATTERY_TIRE',
                  'INSTALLATION',
                  'DELIVERY'
                ]
              }
            })
              .sort({ updatedAt: -1 })
              .select('_id')
              .lean();

            if (active?._id) {
              const booking = await Booking.findById(active._id).lean();
              bookingId = String(active._id);
              activeBookingCache.set(userId, { bookingId, updatedAt: now });
            } else {
              activeBookingCache.delete(userId);
            }
          } catch (e) {
            
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
          name: socket.user.name,
          isOnline: true
        });
      }
    });

    // Handle manual booking update emission from client (for faster sync)
    socket.on('bookingUpdated', (booking) => {
      if (!booking || !booking._id) return;
      const bookingId = String(booking._id);
      
      // Broadcast to relevant rooms
      io.to('admin').emit('bookingUpdated', booking);
      io.to(`booking_${bookingId}`).emit('bookingUpdated', booking);
      
      // Notify individual users involved
      const userIds = [
        booking.user?._id || booking.user,
        booking.merchant?._id || booking.merchant,
        booking.pickupDriver?._id || booking.pickupDriver,
        booking.technician?._id || booking.technician,
        booking.carWash?.staffAssigned?._id || booking.carWash?.staffAssigned
      ].filter(id => id);

      userIds.forEach(uid => {
        io.to(`user_${String(uid)}`).emit('bookingUpdated', booking);
      });
    });

    // Handle chat messages
    socket.on('sendMessage', async (data) => {
      if (!socket.user || !data.bookingId) return;
      if (!data.text && !data.approval) return; // Must have either text or approval

      try {
        const messageData = {
          bookingId: data.bookingId,
          sender: socket.user._id,
          text: data.text || (data.approval ? `Approval required for part: ${data.approval.partName}` : ''),
        };

        // Default recipientRole to isolate chats if not provided
        if (!data.recipientRole) {
          const userRole = socket.user.role?.toLowerCase();
          if (userRole === 'customer') {
            // Customer messages should be visible to everyone (merchant, staff, admin)
            messageData.recipientRole = 'all';
          } else if (userRole === 'merchant') {
            // Merchants default to talking to customers and staff
            messageData.recipientRole = 'all';
          } else if (userRole === 'staff') {
            // Staff (drivers/technicians) talk to merchants/admins, 
            // but let's make it 'all' so customers can also see their updates
            messageData.recipientRole = 'all';
          } else {
            messageData.recipientRole = 'all';
          }
        } else {
          messageData.recipientRole = data.recipientRole;
        }

        if (data.type) messageData.type = data.type;
        if (data.approval) {
          messageData.approval = {
            ...data.approval,
            status: data.approval.status || 'pending'
          };
          if (data.approval.image) messageData.approval.image = data.approval.image;
        }

        const message = new Message(messageData);
        await message.save();

        const populatedMessage = await message.populate('sender', '_id name role');
        emitChatMessage(data.bookingId, populatedMessage);
      } catch (e) {
        console.error('Error sending message:', e);
      }
    });

    socket.on('getMessages', async (data) => {
      if (!socket.user || !data.bookingId) return;

      try {
        const query = { bookingId: data.bookingId };
        
        // Filter out messages not meant for the current user's role
        if (socket.user) {
          const userRole = socket.user.role?.toLowerCase();
          if (userRole === 'merchant') {
            // Merchants see messages to customers AND staff
            query.recipientRole = { $in: ['all', 'customer', 'merchant', undefined, null] };
          } else if (userRole === 'staff') {
            // Drivers only see internal merchant-targeted messages
            query.recipientRole = { $in: ['all', 'merchant', undefined, null] };
          } else if (userRole === 'customer') {
            // Customers only see customer-targeted messages
            query.recipientRole = { $in: ['all', 'customer', undefined, null] };
          }
          // Admin can see everything (default query)
        }

        const messages = await Message.find(query)
          .populate('sender', 'name role')
          .sort({ createdAt: 1 });

        // Ensure all messages have string IDs
        const formattedMessages = messages.map(m => {
          const obj = m.toObject();
          if (obj._id) obj._id = obj._id.toString();
          if (obj.bookingId) obj.bookingId = obj.bookingId.toString();
          if (obj.sender && obj.sender._id) {
            obj.sender._id = obj.sender._id.toString();
          }
          return obj;
        });

        socket.emit('loadMessages', formattedMessages);
      } catch (e) {
        console.error('Error loading messages:', e);
      }
    });

    socket.on('disconnect', () => {
      
    });
  });

  return io;
};

export const emitChatMessage = (bookingId, message) => {
  if (!io) return;
  
  // Ensure we have a plain object with string IDs
  const msgObj = (typeof message.toObject === 'function') ? message.toObject() : message;
  if (msgObj._id) msgObj._id = msgObj._id.toString();
  if (msgObj.bookingId) msgObj.bookingId = msgObj.bookingId.toString();
  if (msgObj.sender && msgObj.sender._id) {
    msgObj.sender._id = msgObj.sender._id.toString();
  }

  const roomBase = `booking_${bookingId.toString()}`;

  // Ensure admins always get messages for monitoring
  io.to('admin').emit('receiveMessage', msgObj);

  if (!msgObj.recipientRole || msgObj.recipientRole === 'all') {
    io.to(roomBase).emit('receiveMessage', msgObj);
    // Also notify global rooms for merchants and staff if appropriate
    io.to('merchant').emit('receiveMessage', msgObj);
    io.to('staff').emit('receiveMessage', msgObj);
  } else {
    // Emit to specific sub-room
    io.to(`${roomBase}_${msgObj.recipientRole}`).emit('receiveMessage', msgObj);
    
    // Also notify global role room
    io.to(msgObj.recipientRole).emit('receiveMessage', msgObj);
  }
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

