import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import compression from 'compression';
import helmet from 'helmet';
import { initSocket } from './socket.js';

import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import Review from './models/Review.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { errorHandler, logger } from './middleware/errorHandler.js';
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
import uploadRoutes from './routes/uploadRoutes.js';
import heroRoutes from './routes/heroRoutes.js';
import vehicleReferenceRoutes from './routes/vehicleReferenceRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import settingRoutes from './routes/settingRoutes.js';

dotenv.config();

const app = express();
// Force nodemon restart for review route changes
const server = http.createServer(app);
// Initialize Socket.IO
initSocket(server);

const PORT = process.env.PORT || 5000;

 // CORS Configuration
const allowedOrigins = process.env.FRONTEND_URLS 
  ? process.env.FRONTEND_URLS.split(',').map(o => o.trim().toLowerCase().replace(/\/$/, ""))
  : [];

// Add some defaults
if (!allowedOrigins.includes('http://localhost:8080')) {
  allowedOrigins.push('http://localhost:8080');
}
if (!allowedOrigins.includes('http://127.0.0.1:8080')) {
  allowedOrigins.push('http://127.0.0.1:8080');
}
if (!allowedOrigins.includes('https://car.speshwayhrms.com')) {
  allowedOrigins.push('https://car.speshwayhrms.com');
}
if (!allowedOrigins.includes('https://carb.speshwayhrms.com')) {
  allowedOrigins.push('https://carb.speshwayhrms.com');
}
if (!allowedOrigins.includes('https://api.carzzi.com')) {
  allowedOrigins.push('https://api.carzzi.com');
}
if (!allowedOrigins.includes('https://carzzi.com')) {
  allowedOrigins.push('https://carzzi.com');
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
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors(corsOptions));
// Handle preflight for all routes
app.options(/(.*)/, cors(corsOptions));

// Raw body parser for webhooks (before express.json())
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
// Direct implementation of getMyReviews to bypass any router issues
app.get('/api/reviews/my', async (req, res) => {
  try {
    // We need to verify token manually here since we are bypassing the router's protect middleware
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const reviews = await Review.find({ reviewer: decoded.id })
      .populate('target', 'name email role')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get('/api/reviews/my-test', (req, res) => res.json({ message: 'direct route working' }));
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/vehicle-reference', vehicleReferenceRoutes);

// API health check
app.get('/api/health', (_, res) => {
  res.send('Carzzi API is running')
});

// Catch-all for unmatched /api routes
app.use('/api', (req, res) => {
  logger.info(`Unmatched API route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Serve frontend static files - ONLY if dist exists
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));

// Handles any requests that don't match the ones above
// Ensure this ONLY catches non-API routes
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Database Connection
mongoose.connect(process.env.MONGO_URI);

;

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
