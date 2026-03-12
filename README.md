# DriveFlow - Vehicle Management System

A comprehensive vehicle service management platform with real-time tracking, booking management, and multi-role support.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Installation & Running

#### Option 1: Automated Start (Windows)
```powershell
.\start-dev.ps1
```

#### Option 2: Automated Start (Linux/Mac)
```bash
chmod +x start-dev.sh
./start-dev.sh
```

#### Option 3: Manual Start

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5000
- **API Test**: http://localhost:5000/api/test-cors

## 📁 Project Structure

```
├── backend/              # Node.js + Express API
│   ├── config/          # Firebase & database config
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth & validation
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── utils/           # Email, push notifications
│   └── index.js         # Entry point
│
├── frontend/            # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages (admin, customer, staff, merchant)
│   │   ├── services/    # API service layer
│   │   ├── store/       # Zustand state management
│   │   ├── layouts/     # Layout components
│   │   └── hooks/       # Custom React hooks
│   └── package.json
│
└── README.md
```

## 🔑 Key Features

- **Multi-Role System**: Admin, Merchant, Staff, Customer
- **Real-Time Tracking**: Live location updates via Socket.IO
- **Booking Management**: Complete service booking workflow
- **Payment Integration**: Razorpay payment gateway
- **Document Management**: Cloudinary-based file uploads
- **Push Notifications**: Firebase Cloud Messaging
- **Email Notifications**: Nodemailer integration
- **Audit Logging**: Complete activity tracking

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (real-time)
- JWT Authentication
- Firebase Admin SDK
- Razorpay SDK
- Cloudinary
- Nodemailer

### Frontend
- React 18
- TypeScript
- Vite
- TanStack Query
- Zustand (state)
- React Router v6
- Shadcn/ui + Radix UI
- Tailwind CSS
- Leaflet (maps)
- Socket.IO Client

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
FRONTEND_URLS=http://localhost:8080,http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

## 🧪 Testing

### Frontend
```bash
cd frontend
npm run test        # Run tests once
npm run test:watch  # Watch mode
```

### Backend
```bash
cd backend
npm test
```

## 📦 Building for Production

### Frontend
```bash
cd frontend
npm run build
npm run preview  # Preview production build
```

### Backend
```bash
cd backend
npm start
```

## 🔐 Default Roles

- **Admin**: Full system access
- **Merchant**: Service provider management
- **Staff**: Field operations & service delivery
- **Customer**: Book services & track orders

## 📊 API Routes

- `/api/auth` - Authentication
- `/api/bookings` - Booking management
- `/api/vehicles` - Vehicle management
- `/api/services` - Service catalog
- `/api/payments` - Payment processing
- `/api/tracking` - Live tracking
- `/api/users` - User management
- `/api/notifications` - Notifications
- `/api/reports` - Analytics & reports

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is proprietary software.

## 🐛 Known Issues

None currently. All systems operational.

## 📞 Support

For support, contact the development team.
