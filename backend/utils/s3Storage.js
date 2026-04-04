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
const FILE_KEY = 'vehicle_reference_data.json';

export const getVehicleDataFromS3 = async () => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: FILE_KEY,
    });
    const response = await s3.send(command);
    const bodyContents = await streamToString(response.Body);
    return JSON.parse(bodyContents);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      console.log('S3 file not found, returning empty array');
      return [];
    }
    console.error('Error fetching data from S3:', error);
    throw error;
  }
};

export const saveVehicleDataToS3 = async (data) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: FILE_KEY,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    });
    await s3.send(command);
    console.log('Data saved to S3 successfully');
  } catch (error) {
    console.error('Error saving data to S3:', error);
    throw error;
  }
};

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
