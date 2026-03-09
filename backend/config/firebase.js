import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Primary path from environment variable, fallback to local file in the same directory
const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const localPath = join(__dirname, 'firebase-service-account.json');

// Decide which path to use: use envPath if it's set and the file exists, otherwise use localPath
let serviceAccountPath;
if (envPath && existsSync(envPath)) {
  serviceAccountPath = envPath;
} else {
  serviceAccountPath = localPath;
}

let serviceAccount;
try {
  if (!existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
  }
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error(`Failed to load Firebase service account:`, error.message);
  // Optional: provide a more descriptive error if needed
  throw error;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export default admin;
