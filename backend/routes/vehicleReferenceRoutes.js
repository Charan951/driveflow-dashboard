import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import asyncHandler from 'express-async-handler';
import { getVehicleDataFromS3, saveVehicleDataToS3 } from '../utils/s3Storage.js';
import crypto from 'crypto';
import { protect, admin } from '../middleware/authMiddleware.js';
import { emitEntitySync } from '../utils/syncService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// @desc    Import vehicle reference data from Excel
// @route   POST /api/vehicle-reference/import
// @access  Private/Admin
router.post('/import', protect, admin, upload.single('file'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel file' });
    }

    console.log('File received:', req.file.originalname, 'Size:', req.file.size);

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Get raw rows to find the header row
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (rawRows.length < 1) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }

    console.log('Total raw rows found:', rawRows.length);

    // Find header row (the one containing "brand_name" or "brand_model" or "Model")
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i];
      if (Array.isArray(row)) {
        const rowString = row.join(' ').toLowerCase();
        if (rowString.includes('brand_name') || rowString.includes('brand_model') || rowString.includes('model')) {
          headerRowIndex = i;
          console.log(`Header row found at index: ${i}, Headers:`, row);
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      console.warn('Header row not found, falling back to index 0');
      headerRowIndex = 0;
    }

    const headers = rawRows[headerRowIndex].map(h => h ? String(h).trim() : '');
    const dataRows = rawRows.slice(headerRowIndex + 1);

    console.log(`Processing ${dataRows.length} data rows with headers:`, headers);

    const vehicleData = dataRows
      .map((row, idx) => {
        const item = {};
        headers.forEach((header, index) => {
          if (header) {
            item[header] = row[index];
          }
        });
        return item;
      })
      .filter((item, idx) => {
        const fuzzyMatch = (obj, keys) => {
          const objectKeys = Object.keys(obj);
          const foundKey = objectKeys.find(k => {
            const normalizedK = k.toLowerCase().replace(/[\s_-]/g, '');
            return keys.some(key => {
              const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
              return normalizedK === normalizedKey;
            });
          });
          return foundKey ? obj[foundKey] : undefined;
        };

        const brand = fuzzyMatch(item, ['brandname', 'brand_name', 'brand']);
        const model = fuzzyMatch(item, ['model']);
        const brandModel = fuzzyMatch(item, ['brandmodel', 'brand_model', 'brand_model_name']);
        
        const isValid = brand && model && brandModel;
        if (!isValid && idx < 5) {
          console.log(`Row ${idx + headerRowIndex + 2} is invalid:`, { brand, model, brandModel, item });
        }
        return isValid;
      })
      .map((item) => {
        const fuzzyMatch = (obj, keys) => {
          const objectKeys = Object.keys(obj);
          const foundKey = objectKeys.find(k => {
            const normalizedK = k.toLowerCase().replace(/[\s_-]/g, '');
            return keys.some(key => {
              const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
              return normalizedK === normalizedKey;
            });
          });
          return foundKey ? obj[foundKey] : undefined;
        };

        return {
          brand_name: String(fuzzyMatch(item, ['brandname', 'brand_name', 'brand']) || '').trim(),
          model: String(fuzzyMatch(item, ['model']) || '').trim(),
          brand_model: String(fuzzyMatch(item, ['brandmodel', 'brand_model', 'brand_model_name']) || '').trim(),
          front_tyres: String(fuzzyMatch(item, ['fronttyres', 'fronttyre', 'front_tyres', 'front_tyre', 'front_tyre_size']) || '').trim(),
          rear_tyres: String(fuzzyMatch(item, ['reartyres', 'reartyre', 'rear_tyres', 'rear_tyre', 'rear_tyre_size']) || '').trim(),
          battery_details: String(fuzzyMatch(item, ['batterydetails', 'battery', 'battery_info']) || '').trim(),
          pickup_drop_price: fuzzyMatch(item, ['pickup_drop_price', 'pickupprice', 'drop_price', 'pickupdrop_price', 'pickup_drop_price']) || '',
          tyre_price_bridgestone: fuzzyMatch(item, ['tyrepricebridgestone', 'tyre_price_bridgestone', 'bridgestone']) || '',
          tyre_price_yokohama: fuzzyMatch(item, ['tyrepriceyokohama', 'tyre_price_yokohama', 'yokohama', 'yokohoma', 'tyrepriceyokohoma']) || '',
          tyre_price_apollo: fuzzyMatch(item, ['tyrepriceapollo', 'tyre_price_apollo', 'apollo']) || '',
          tyre_price_michelin: fuzzyMatch(item, ['tyrepricemichellin', 'tyre_price_michellin', 'michelin', 'michellin']) || '',
          tyre_price_dummy2: fuzzyMatch(item, ['tyrepricedummy2', 'tyre_price_dummy2', 'dummy2']) || '',
          tyre_price_dummy: fuzzyMatch(item, ['tyrepricedummy', 'tyre_price_dummy', 'dummy']) || '',
          battery_price_amaron: fuzzyMatch(item, ['batterypriceamaron', 'battery_price_amaron', 'amaron']) || '',
          battery_price_exide: fuzzyMatch(item, ['batterypriceexide', 'battery_price_exide', 'exide']) || '',
          car_wash_price: fuzzyMatch(item, ['carwashprice', 'car_wash_price', 'carwash']) || '',
          car_wash_exterior_price: fuzzyMatch(item, ['car_wash_exterior_wash', 'exterior_wash', 'car_wash_exterior_price', 'carwash-exteriorwash']) || '',
          car_wash_interior_exterior_price: fuzzyMatch(item, ['car_wash_interior_exterior', 'interior_exterior', 'car_wash_interior_exterior_price', 'carwash-interior+exterior']) || '',
          car_wash_interior_exterior_underbody_price: fuzzyMatch(item, ['car_wash_interior_exterior_underbody_wash', 'underbody_wash', 'car_wash_interior_exterior_underbody_price', 'carwash-interior+exterior+underbodywash']) || '',
          general_service_price: fuzzyMatch(item, [
            'generalprice',
            'general_price',
            'general service price',
            'generalserviceprice',
          ]) || '',
        };
      });

    console.log('Processed valid vehicle rows:', vehicleData.length);

    if (vehicleData.length === 0) {
      return res.status(400).json({ 
        message: 'No valid vehicle data found. Ensure headers like "brand_name", "Model", and "brand_model" exist.' 
      });
    }

    // Load existing data from S3
    const existingData = await getVehicleDataFromS3();
    
    // Create a unique key for each vehicle: brand_name | model | brand_model
    const getUniqueKey = (item) => `${item.brand_name.toLowerCase()}|${item.model.toLowerCase()}|${item.brand_model.toLowerCase()}`;
    
    const dataMap = new Map(existingData.map(item => [getUniqueKey(item), item]));

    let upsertedCount = 0;
    let modifiedCount = 0;

    vehicleData.forEach(item => {
      const key = getUniqueKey(item);
      if (dataMap.has(key)) {
        const existing = dataMap.get(key);
        dataMap.set(key, { ...existing, ...item, updatedAt: new Date().toISOString() });
        modifiedCount++;
      } else {
        const newItem = {
          _id: crypto.randomUUID(),
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dataMap.set(key, newItem);
        upsertedCount++;
      }
    });

    const updatedData = Array.from(dataMap.values());
    await saveVehicleDataToS3(updatedData);

    emitEntitySync('vehicle_reference', 'updated', updatedData);

    res.status(200).json({
      message: 'Data imported successfully and saved to S3',
      count: vehicleData.length,
      upsertedCount,
      modifiedCount,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      message: 'Failed to import data', 
      error: error.message 
    });
  }
}));

// @desc    Get all vehicle reference data
// @route   GET /api/vehicle-reference
// @access  Public/Private
router.get('/', asyncHandler(async (req, res) => {
  const data = await getVehicleDataFromS3();
  // Sort by brand_name and model
  data.sort((a, b) => {
    if (a.brand_name < b.brand_name) return -1;
    if (a.brand_name > b.brand_name) return 1;
    if (a.model < b.model) return -1;
    if (a.model > b.model) return 1;
    return 0;
  });
  res.json(data);
}));

// @desc    Get tire details by brand and model
// @route   GET /api/vehicle-reference/search
// @access  Public/Private
router.get('/search', asyncHandler(async (req, res) => {
  const { brand_name, model, variant } = req.query;
  
  if (!brand_name || !model) {
    return res.status(400).json({ message: 'Brand and Model are required' });
  }

  const cleanBrand = brand_name.trim().toLowerCase();
  const fullModel = model.trim().toLowerCase();
  const cleanModel = model.replace(/\[.*\]/g, '').trim().toLowerCase();
  const cleanVariant = variant ? variant.trim().toLowerCase() : '';

  const allData = await getVehicleDataFromS3();

  // Helper function for regex-like match
  const matches = (value, search) => {
    if (!value) return false;
    return value.toLowerCase().includes(search);
  };

  const exactMatches = (value, search) => {
    if (!value) return false;
    return value.toLowerCase() === search;
  };

  // 1. Try exact match for Brand, Model (full), and Variant
  if (cleanVariant) {
    const exactMatch = allData.find(item => 
      exactMatches(item.brand_name, cleanBrand) && 
      (exactMatches(item.model, fullModel) || exactMatches(item.model, cleanModel)) && 
      exactMatches(item.brand_model, cleanVariant)
    );
    if (exactMatch) {
      return res.json(exactMatch);
    }

    // 2. Strict exact match for Variant only (if user provided it, we want exact)
    // We removed the partial matches(item.brand_model, cleanVariant) as per user request
  }

  // 3. If no variant provided or no exact match, try exact model fallback
  const exactModelFallback = allData.find(item => 
    exactMatches(item.brand_name, cleanBrand) && 
    (exactMatches(item.model, fullModel) || exactMatches(item.model, cleanModel))
  );
  if (exactModelFallback) {
    return res.json(exactModelFallback);
  }

  // 4. Broader search: exact brand and partial model (only if no exact match was found)
  const fallbackData = allData.find(item => 
    exactMatches(item.brand_name, cleanBrand) && 
    (matches(item.model, fullModel) || matches(item.model, cleanModel))
  );

  if (fallbackData) {
    res.json(fallbackData);
  } else {
    res.status(404).json({ message: 'Vehicle data not found' });
  }
}));

// @desc    Create a vehicle reference
// @route   POST /api/vehicle-reference
// @access  Private/Admin
router.post('/', protect, admin, asyncHandler(async (req, res) => {
  const { 
    brand_name, model, brand_model, front_tyres, rear_tyres, battery_details, pickup_drop_price,
    tyre_price_bridgestone, tyre_price_yokohama, tyre_price_apollo, tyre_price_michelin,
    tyre_price_dummy2, tyre_price_dummy, battery_price_amaron, battery_price_exide, car_wash_price,
    car_wash_exterior_price, car_wash_interior_exterior_price, car_wash_interior_exterior_underbody_price,
    general_service_price
  } = req.body;

  if (!brand_name || !model || !brand_model) {
    return res.status(400).json({ message: 'Brand, Model, and Brand Model (Variant) are required' });
  }

  const allData = await getVehicleDataFromS3();
  const exists = allData.find(item => 
    item.brand_name.toLowerCase() === brand_name.toLowerCase() && 
    item.model.toLowerCase() === model.toLowerCase() && 
    item.brand_model.toLowerCase() === brand_model.toLowerCase()
  );
  
  if (exists) {
    return res.status(400).json({ message: 'Vehicle reference with this brand, model and variant already exists' });
  }

  const newVehicle = {
    _id: crypto.randomUUID(),
    brand_name,
    model,
    brand_model,
    front_tyres,
    rear_tyres,
    battery_details,
    pickup_drop_price,
    tyre_price_bridgestone,
    tyre_price_yokohama,
    tyre_price_apollo,
    tyre_price_michelin,
    tyre_price_dummy2,
    tyre_price_dummy,
    battery_price_amaron,
    battery_price_exide,
    car_wash_price,
    car_wash_exterior_price,
    car_wash_interior_exterior_price,
    car_wash_interior_exterior_underbody_price,
    general_service_price,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  allData.push(newVehicle);
  await saveVehicleDataToS3(allData);
  emitEntitySync('vehicle_reference', 'created', newVehicle);

  res.status(201).json(newVehicle);
}));

// @desc    Update a vehicle reference
// @route   PUT /api/vehicle-reference/:id
// @access  Private/Admin
router.put('/:id', protect, admin, asyncHandler(async (req, res) => {
  const allData = await getVehicleDataFromS3();
  const index = allData.findIndex(item => item._id === req.params.id);

  if (index !== -1) {
    const updatedVehicle = {
      ...allData[index],
      brand_name: req.body.brand_name || allData[index].brand_name,
      model: req.body.model || allData[index].model,
      brand_model: req.body.brand_model || allData[index].brand_model,
      front_tyres: req.body.front_tyres || allData[index].front_tyres,
      rear_tyres: req.body.rear_tyres || allData[index].rear_tyres,
      battery_details: req.body.battery_details || allData[index].battery_details,
      pickup_drop_price: req.body.pickup_drop_price !== undefined ? req.body.pickup_drop_price : allData[index].pickup_drop_price,
      tyre_price_bridgestone: req.body.tyre_price_bridgestone !== undefined ? req.body.tyre_price_bridgestone : allData[index].tyre_price_bridgestone,
      tyre_price_yokohama: req.body.tyre_price_yokohama !== undefined ? req.body.tyre_price_yokohama : allData[index].tyre_price_yokohama,
      tyre_price_apollo: req.body.tyre_price_apollo !== undefined ? req.body.tyre_price_apollo : allData[index].tyre_price_apollo,
      tyre_price_michelin: req.body.tyre_price_michelin !== undefined ? req.body.tyre_price_michelin : allData[index].tyre_price_michelin,
      tyre_price_dummy2: req.body.tyre_price_dummy2 !== undefined ? req.body.tyre_price_dummy2 : allData[index].tyre_price_dummy2,
      tyre_price_dummy: req.body.tyre_price_dummy !== undefined ? req.body.tyre_price_dummy : allData[index].tyre_price_dummy,
      battery_price_amaron: req.body.battery_price_amaron !== undefined ? req.body.battery_price_amaron : allData[index].battery_price_amaron,
      battery_price_exide: req.body.battery_price_exide !== undefined ? req.body.battery_price_exide : allData[index].battery_price_exide,
      car_wash_price: req.body.car_wash_price !== undefined ? req.body.car_wash_price : allData[index].car_wash_price,
      car_wash_exterior_price: req.body.car_wash_exterior_price !== undefined ? req.body.car_wash_exterior_price : allData[index].car_wash_exterior_price,
      car_wash_interior_exterior_price: req.body.car_wash_interior_exterior_price !== undefined ? req.body.car_wash_interior_exterior_price : allData[index].car_wash_interior_exterior_price,
      car_wash_interior_exterior_underbody_price: req.body.car_wash_interior_exterior_underbody_price !== undefined ? req.body.car_wash_interior_exterior_underbody_price : allData[index].car_wash_interior_exterior_underbody_price,
      general_service_price: req.body.general_service_price !== undefined ? req.body.general_service_price : allData[index].general_service_price,
      updatedAt: new Date().toISOString()
    };

    allData[index] = updatedVehicle;
    await saveVehicleDataToS3(allData);
    emitEntitySync('vehicle_reference', 'updated', updatedVehicle);
    res.json(updatedVehicle);
  } else {
    res.status(404).json({ message: 'Vehicle reference not found' });
  }
}));

// @desc    Delete all vehicle references
// @route   DELETE /api/vehicle-reference/all
// @access  Private/Admin
router.delete('/all', protect, admin, asyncHandler(async (req, res) => {
  await saveVehicleDataToS3([]);
  emitEntitySync('vehicle_reference', 'deleted', {all: true});
  res.json({ message: 'All vehicle references removed' });
}));

// @desc    Delete a vehicle reference
// @route   DELETE /api/vehicle-reference/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const allData = await getVehicleDataFromS3();
  const filteredData = allData.filter(item => item._id !== req.params.id);

  if (filteredData.length < allData.length) {
    await saveVehicleDataToS3(filteredData);
    emitEntitySync('vehicle_reference', 'deleted', {_id: req.params.id});
    res.json({ message: 'Vehicle reference removed' });
  } else {
    res.status(404).json({ message: 'Vehicle reference not found' });
  }
}));

export default router;
