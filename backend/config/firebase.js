import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the path from .env if available, otherwise fall back to local file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || join(__dirname, 'firebase-service-account.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error(`Failed to load Firebase service account from ${serviceAccountPath}:`, error.message);
  // Optional: provide a more descriptive error if needed
  throw error;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export default admin;
