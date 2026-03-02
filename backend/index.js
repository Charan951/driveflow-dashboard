import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
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

console.log('Mongo URI:', process.env.MONGO_URI);

// CORS Configuration
const isDev = process.env.NODE_ENV !== 'production';
const devOriginPrefixes = ['http://localhost:', 'http://127.0.0.1:', 'http://0.0.0.0:'];

const allowedOrigins = process.env.FRONTEND_URLS 
  ? process.env.FRONTEND_URLS.split(',').map(o => o.trim().toLowerCase().replace(/\/$/, ""))
  : [];

// Add some defaults if not in .env
if (!allowedOrigins.includes('https://car.speshwayhrms.com')) {
  allowedOrigins.push('https://car.speshwayhrms.com');
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
    const isDev = process.env.NODE_ENV !== 'production';
    const devOriginPrefixes = ['http://localhost:', 'http://127.0.0.1:', 'http://0.0.0.0:'];

    const allowedByEnv = allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin);
    const allowedByDevDefault = isDev && devOriginPrefixes.some((prefix) => normalizedOrigin.startsWith(prefix));

    if (allowedByEnv || allowedByDevDefault) {
      callback(null, true);
    } else {
      console.log(`CORS blocked for origin: ${origin}`);
      // Returning null, false instead of an Error to allow the request to finish 
      // without CORS headers, which the browser will correctly block.
      // Throwing an error here can cause Express to send a 500 without CORS headers for preflight.
      callback(null, false);
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
// Handle preflight for all routes
app.options('(.*)', cors(corsOptions));
app.use(express.json());

// Routes
app.get('/api/test-cors', (req, res) => {
  res.json({ message: 'CORS is working!' });
});
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
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Basic Route
app.get('/', (req, res) => {
  res.send('DriveFlow API is running');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
