import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import asyncHandler from 'express-async-handler';
import { getVehicleDataFromS3, saveVehicleDataToS3 } from '../utils/s3Storage.js';
import crypto from 'crypto';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// @desc    Import vehicle reference data from Excel
// @route   POST /api/vehicle-reference/import
// @access  Private/Admin
router.post('/import', upload.single('file'), asyncHandler(async (req, res) => {
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
    const dataMap = new Map(existingData.map(item => [item.brand_model, item]));

    let upsertedCount = 0;
    let modifiedCount = 0;

    vehicleData.forEach(item => {
      if (dataMap.has(item.brand_model)) {
        const existing = dataMap.get(item.brand_model);
        dataMap.set(item.brand_model, { ...existing, ...item });
        modifiedCount++;
      } else {
        const newItem = {
          _id: crypto.randomUUID(),
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dataMap.set(item.brand_model, newItem);
        upsertedCount++;
      }
    });

    const updatedData = Array.from(dataMap.values());
    await saveVehicleDataToS3(updatedData);

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
  const cleanModel = model.replace(/\[.*\]/g, '').trim().toLowerCase();
  const cleanVariant = variant ? variant.trim().toLowerCase() : '';

  console.log(`Searching for: Brand=${cleanBrand}, Model=${cleanModel}, Variant=${cleanVariant}`);

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

  // 1. Try exact match for Brand, Model, and Variant
  if (cleanVariant) {
    const exactMatch = allData.find(item => 
      exactMatches(item.brand_name, cleanBrand) && 
      exactMatches(item.model, cleanModel) && 
      exactMatches(item.brand_model, cleanVariant)
    );
    if (exactMatch) {
      console.log('Found exact match (Model & Variant):', exactMatch.brand_model);
      return res.json(exactMatch);
    }

    // 2. Try exact Brand and Model with partial Variant match
    const modelExactVariantPartial = allData.find(item => 
      exactMatches(item.brand_name, cleanBrand) && 
      exactMatches(item.model, cleanModel) && 
      matches(item.brand_model, cleanVariant)
    );
    if (modelExactVariantPartial) {
      console.log('Found model exact + variant partial:', modelExactVariantPartial.brand_model);
      return res.json(modelExactVariantPartial);
    }
  }

  // 3. If variant didn't help, but we have an exact model match, use that
  const exactModelFallback = allData.find(item => 
    exactMatches(item.brand_name, cleanBrand) && 
    exactMatches(item.model, cleanModel)
  );
  if (exactModelFallback) {
    console.log('Found exact model fallback:', exactModelFallback.brand_model);
    return res.json(exactModelFallback);
  }

  // 4. Broader search: exact brand and partial model
  if (cleanVariant) {
    const data = allData.find(item => 
      exactMatches(item.brand_name, cleanBrand) && 
      matches(item.model, cleanModel) && 
      matches(item.brand_model, cleanVariant)
    );
    if (data) {
      console.log('Found with partial model + variant:', data.brand_model, data.model);
      return res.json(data);
    }
  }

  const fallbackData = allData.find(item => 
    exactMatches(item.brand_name, cleanBrand) && 
    matches(item.model, cleanModel)
  );

  if (fallbackData) {
    console.log('Found with partial model only:', fallbackData.brand_model, fallbackData.model);
    res.json(fallbackData);
  } else {
    console.log('No vehicle data found');
    res.status(404).json({ message: 'Vehicle data not found' });
  }
}));

// @desc    Create a vehicle reference
// @route   POST /api/vehicle-reference
// @access  Private/Admin
router.post('/', asyncHandler(async (req, res) => {
  const { brand_name, model, brand_model, front_tyres, rear_tyres, battery_details } = req.body;

  const allData = await getVehicleDataFromS3();
  const exists = allData.find(item => item.brand_model === brand_model);
  
  if (exists) {
    return res.status(400).json({ message: 'Vehicle reference with this brand model already exists' });
  }

  const newVehicle = {
    _id: crypto.randomUUID(),
    brand_name,
    model,
    brand_model,
    front_tyres,
    rear_tyres,
    battery_details,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  allData.push(newVehicle);
  await saveVehicleDataToS3(allData);

  res.status(201).json(newVehicle);
}));

// @desc    Update a vehicle reference
// @route   PUT /api/vehicle-reference/:id
// @access  Private/Admin
router.put('/:id', asyncHandler(async (req, res) => {
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
      updatedAt: new Date().toISOString()
    };

    allData[index] = updatedVehicle;
    await saveVehicleDataToS3(allData);
    res.json(updatedVehicle);
  } else {
    res.status(404).json({ message: 'Vehicle reference not found' });
  }
}));

// @desc    Delete a vehicle reference
// @route   DELETE /api/vehicle-reference/:id
// @access  Private/Admin
router.delete('/:id', asyncHandler(async (req, res) => {
  const allData = await getVehicleDataFromS3();
  const filteredData = allData.filter(item => item._id !== req.params.id);

  if (filteredData.length < allData.length) {
    await saveVehicleDataToS3(filteredData);
    res.json({ message: 'Vehicle reference removed' });
  } else {
    res.status(404).json({ message: 'Vehicle reference not found' });
  }
}));

export default router;
