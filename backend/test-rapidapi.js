import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const testRapidAPI = async () => {
  const vehicle_number = 'TS08JY4741';
  const rapidKey = process.env.RAPID_API_KEY || process.env.RAPIDAPI_KEY;
  const rapidHost = process.env.RAPIDAPI_HOST || 'vehicle-rc-information.p.rapidapi.com';
  const rapidUrl = process.env.RAPIDAPI_ENDPOINT || `https://${rapidHost}/advanced`;

  console.log(`Testing RapidAPI Advanced with vehicle: ${vehicle_number}`);
  console.log(`URL: ${rapidUrl}`);
  console.log(`Using Key: ${rapidKey ? '***' + rapidKey.slice(-4) : 'MISSING'}`);

  try {
    const options = {
      method: 'POST',
      url: rapidUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': rapidHost,
        'x-rapidapi-key': rapidKey
      },
      data: {
        vehicle_number: vehicle_number
      }
    };

    const response = await axios.request(options);
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.status === 'success' && response.data.data) {
      console.log('SUCCESS: Vehicle found!');
    } else {
      console.log('FAILED: Vehicle not found or unexpected structure.');
    }
  } catch (error) {
    console.error('ERROR:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
};

testRapidAPI();
