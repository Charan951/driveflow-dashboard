import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export const getDataFromS3 = async (fileKey) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    const response = await s3.send(command);
    const bodyContents = await streamToString(response.Body);
    return JSON.parse(bodyContents);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      console.log(`S3 file ${fileKey} not found, returning null/empty`);
      return null;
    }
    console.error(`Error fetching data from S3 (${fileKey}):`, error);
    throw error;
  }
};

export const saveDataToS3 = async (fileKey, data) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    });
    await s3.send(command);
    console.log(`Data saved to S3 successfully (${fileKey})`);
  } catch (error) {
    console.error(`Error saving data to S3 (${fileKey}):`, error);
    throw error;
  }
};

let vehicleDataCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

export const getVehicleDataFromS3 = async () => {
  const now = Date.now();
  if (vehicleDataCache && (now - lastFetchTime < CACHE_TTL)) {
    return vehicleDataCache;
  }

  try {
    const res = await getDataFromS3('vehicle_reference_data.json');
    vehicleDataCache = res || [];
    lastFetchTime = now;
    return vehicleDataCache;
  } catch (error) {
    if (vehicleDataCache) {
      console.warn('Error fetching from S3, using expired cache:', error);
      return vehicleDataCache;
    }
    throw error;
  }
};

export const saveVehicleDataToS3 = async (data) => {
  await saveDataToS3('vehicle_reference_data.json', data);
  vehicleDataCache = data;
  lastFetchTime = Date.now();
};

let vehicleColumnsCache = null;
let lastColumnsFetchTime = 0;

export const getVehicleReferenceColumnsFromS3 = async () => {
  const now = Date.now();
  if (vehicleColumnsCache && (now - lastColumnsFetchTime < CACHE_TTL)) {
    return vehicleColumnsCache;
  }

  try {
    const res = await getDataFromS3('vehicle_reference_columns.json');
    vehicleColumnsCache = res || [];
    lastColumnsFetchTime = now;
    return vehicleColumnsCache;
  } catch (error) {
    if (vehicleColumnsCache) {
      console.warn('Error fetching columns from S3, using expired cache:', error);
      return vehicleColumnsCache;
    }
    throw error;
  }
};

export const saveVehicleReferenceColumnsToS3 = async (data) => {
  await saveDataToS3('vehicle_reference_columns.json', data);
  vehicleColumnsCache = data;
  lastColumnsFetchTime = Date.now();
};

let hiddenBuiltinColumnsCache = null;
let lastHiddenBuiltinFetchTime = 0;

// List of built-in column keys (e.g. 'bridgestone', 'amaron') an admin has
// chosen to hide from the table. The underlying price data is untouched —
// hiding is purely a display/selection-list concern, fully reversible.
export const getHiddenBuiltinColumnsFromS3 = async () => {
  const now = Date.now();
  if (hiddenBuiltinColumnsCache && (now - lastHiddenBuiltinFetchTime < CACHE_TTL)) {
    return hiddenBuiltinColumnsCache;
  }

  try {
    const res = await getDataFromS3('vehicle_reference_hidden_builtins.json');
    hiddenBuiltinColumnsCache = res || [];
    lastHiddenBuiltinFetchTime = now;
    return hiddenBuiltinColumnsCache;
  } catch (error) {
    if (hiddenBuiltinColumnsCache) {
      console.warn('Error fetching hidden built-in columns from S3, using expired cache:', error);
      return hiddenBuiltinColumnsCache;
    }
    throw error;
  }
};

export const saveHiddenBuiltinColumnsToS3 = async (data) => {
  await saveDataToS3('vehicle_reference_hidden_builtins.json', data);
  hiddenBuiltinColumnsCache = data;
  lastHiddenBuiltinFetchTime = Date.now();
};

let builtinColumnLabelsCache = null;
let lastBuiltinLabelsFetchTime = 0;

// Map of built-in column key -> admin-renamed display label (e.g.
// { bridgestone: "Bridgestone Tyres" }). Only ever affects the label shown
// in the UI — the underlying key/fieldName (and thus stored price data)
// never changes.
export const getBuiltinColumnLabelsFromS3 = async () => {
  const now = Date.now();
  if (builtinColumnLabelsCache && (now - lastBuiltinLabelsFetchTime < CACHE_TTL)) {
    return builtinColumnLabelsCache;
  }

  try {
    const res = await getDataFromS3('vehicle_reference_builtin_labels.json');
    builtinColumnLabelsCache = res || {};
    lastBuiltinLabelsFetchTime = now;
    return builtinColumnLabelsCache;
  } catch (error) {
    if (builtinColumnLabelsCache) {
      console.warn('Error fetching built-in column labels from S3, using expired cache:', error);
      return builtinColumnLabelsCache;
    }
    throw error;
  }
};

export const saveBuiltinColumnLabelsToS3 = async (data) => {
  await saveDataToS3('vehicle_reference_builtin_labels.json', data);
  builtinColumnLabelsCache = data;
  lastBuiltinLabelsFetchTime = Date.now();
};


const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
