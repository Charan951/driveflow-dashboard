# DriveFlow Deployment Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (Local or Atlas)
- Git

## Project Structure
- `/backend`: Backend Node.js/Express API
- `/frontend`: Frontend React Application

## 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_app_password
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

4. Start the server:
   - Development: `npm run dev`
   - Production: `npm start`

## 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `frontend` directory (for Vite):
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 3. Production Build

1. Build the frontend:
   ```bash
   npm run build
   ```
   This will create a `dist` folder with the static assets.

2. Serve the frontend from the backend (Optional):
   - You can configure Express to serve the static files from `dist` if you want a single deployment unit.
   - Otherwise, deploy the `dist` folder to Vercel/Netlify and the `server` folder to Render/Heroku.

## 4. Deployment Platforms (Recommendations)

- **Frontend**: Vercel, Netlify
- **Backend**: Render, Railway, Heroku
- **Database**: MongoDB Atlas

## 5. Admin Access
- To create an admin user, you can manually update a user's `role` to `admin` in your MongoDB database using MongoDB Compass or Atlas.
