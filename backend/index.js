import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import compression from 'compression';
import { initSocket } from './socket.js';
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
// Initialize Socket.IO
initSocket(server);

const PORT = process.env.PORT || 5000;

 // CORS Configuration
const allowedOrigins = process.env.FRONTEND_URLS 
  ? process.env.FRONTEND_URLS.split(',').map(o => o.trim().toLowerCase().replace(/\/$/, ""))
  : [];

// Add some defaults
if (!allowedOrigins.includes('https://car.speshwayhrms.com')) {
  allowedOrigins.push('https://car.speshwayhrms.com');
}
if (!allowedOrigins.includes('https://carb.speshwayhrms.com')) {
  allowedOrigins.push('https://carb.speshwayhrms.com');
}

const corsOptions = {
  origin: function (origin, callback) {
    // 1. Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isDev = process.env.NODE_ENV !== 'production';
    const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, "");

    // 2. Explicitly allow local development origins (even in production)
    if (normalizedOrigin.includes('localhost') || 
        normalizedOrigin.includes('127.0.0.1') || 
        normalizedOrigin.startsWith('http://192.168.') || 
        normalizedOrigin.startsWith('http://10.')) {
      return callback(null, true);
    }

    // 3. In development mode, allow all origins
    if (isDev) {
      return callback(null, true);
    }

    // 4. In production, check against allowedOrigins
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin', 
    'Access-Control-Allow-Headers',
    'x-auth-token'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(compression());
app.use(cors(corsOptions));
// Handle preflight for all routes
app.options(/(.*)/, cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/upload', uploadRoutes);

// Static files (removed as we are using Cloudinary)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGO_URI);

// Basic Route
app.get('/', (_, res) => {
  res.send('DriveFlow API is running');
});

server.listen(PORT);
