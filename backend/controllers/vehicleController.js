import Vehicle from '../models/Vehicle.js';
import { emitEntitySync } from '../utils/syncService.js';
import axios from 'axios';

// ... (existing imports)

// @desc    Get all vehicles (Admin)
// @route   GET /api/vehicles/all
// @access  Private/Admin
export const getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({}).populate('user', 'name email phone');
    vehicles.forEach(v => v.calculateHealth());
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Private
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('user', 'name email phone');
    if (vehicle) {
      // Check if user is authorized: owner, admin, merchant, or staff
      const isOwner = vehicle.user?._id?.toString() === req.user._id.toString() || 
                      vehicle.user?.toString() === req.user._id.toString();
      const isElevated = ['admin', 'merchant', 'staff'].includes(req.user.role?.toLowerCase());
      
      if (!isOwner && !isElevated) {
        return res.status(403).json({ message: 'Not authorized to view this vehicle' });
      }

      vehicle.calculateHealth();
      res.json(vehicle);
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get vehicles by user ID
// @route   GET /api/vehicles/user/:userId
// @access  Private
export const getUserVehicles = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Check authorization: Owner, Admin, Merchant, or Staff
    const isOwner = userId === req.user._id.toString();
    const isElevated = ['admin', 'merchant', 'staff'].includes(req.user.role?.toLowerCase());
    
    if (!isOwner && !isElevated) {
      return res.status(403).json({ message: 'Not authorized to view these vehicles' });
    }

    const vehicles = await Vehicle.find({ user: userId });
    vehicles.forEach(v => v.calculateHealth());
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user vehicles
// @route   GET /api/vehicles
// @access  Private
export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user._id });
    vehicles.forEach(v => v.calculateHealth());
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all vehicles with insurance data (Admin)
// @route   GET /api/vehicles/insurance/all
// @access  Private/Admin
export const getInsuranceData = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ 'insurance.policyNumber': { $exists: true } })
      .populate('user', 'name email phone');
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch vehicle RC details from RapidAPI V2
// @route   POST /api/vehicles/rc-details
// @access  Private
export const getVehicleRCDetails = async (req, res) => {
  const { vehicle_number } = req.body;

  if (!vehicle_number) {
    return res.status(400).json({ message: 'Vehicle number is required' });
  }

  // Normalize: No spaces, all uppercase, O -> 0
  const normalizedPlate = vehicle_number.replace(/\s/g, '').toUpperCase().replace(/O/g, '0');

  try {
    const rapidKey = process.env.RAPID_API_KEY || process.env.RAPIDAPI_KEY;
    const rapidHost = process.env.RAPIDAPI_HOST || 'vehicle-rc-information.p.rapidapi.com';
    const rapidUrl = process.env.RAPIDAPI_ENDPOINT || `https://${rapidHost}/advanced`;

    if (!rapidKey) {
      return res.status(500).json({ message: 'RapidAPI key not configured' });
    }

    const options = {
      method: 'POST',
      url: rapidUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': rapidHost,
        'x-rapidapi-key': rapidKey
      },
      data: {
        vehicle_number: normalizedPlate
      }
    };

    const response = await axios.request(options);
    const data = response.data;

    // Based on RapidAPI V2 structure (as per requirement and common patterns)
    if (data && data.status === 'success' && data.data) {
      const rcData = data.data;
      return res.json({
        found: true,
        brand_name: rcData.brand_name || '',
        brand_model: rcData.brand_model || '',
        fuel_type: rcData.fuel_type || '',
        registration_date: rcData.registration_date || '',
        color: rcData.color || '',
        variant: rcData.variant || '',
        engine_number: rcData.engine_number || '',
        chassis_number: rcData.chassis_number || '',
        owner_name: rcData.owner_name || ''
      });
    } else if (data && data.brand_name) {
      // Fallback: Some APIs return data directly without status/data wrapper
      return res.json({
        found: true,
        brand_name: data.brand_name || '',
        brand_model: data.brand_model || '',
        fuel_type: data.fuel_type || '',
        registration_date: data.registration_date || '',
        color: data.color || '',
        variant: data.variant || '',
      });
    } else {
      return res.json({
        found: false,
        message: data?.message || 'Vehicle details not found'
      });
    }
  } catch (error) {
    console.error('RapidAPI Error details:', error.response?.data || error.message);
    
    // Detailed error handling for RapidAPI provider issues (502, 503, 504)
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    if (status === 502 || status === 503 || status === 504) {
      return res.status(status).json({ 
        message: 'RapidAPI Provider Error: The vehicle database provider is temporarily unavailable. Please try again after some time or enter details manually.' 
      });
    }
    
    const isHtmlError = typeof errorData === 'string' && errorData.includes('<!DOCTYPE html>');
    const message = isHtmlError 
      ? 'RapidAPI Provider Error: The API provider is currently down or misconfigured. Please try again later.'
      : (errorData?.message || error.message || 'Failed to fetch vehicle details');
      
    res.status(status || 500).json({ message });
  }
};

// @desc    Fetch vehicle details from external API (Mock/Simulated)
// @route   POST /api/vehicles/fetch-details
// @access  Private
export const fetchVehicleDetails = async (req, res) => {
  const { licensePlate } = req.body;

  if (!licensePlate) {
    return res.status(400).json({ message: 'License plate is required' });
  }

  // Normalize license plate (handle common O vs 0 confusion)
  const normalizedPlate = licensePlate.replace(/\s/g, '').toUpperCase().replace(/O/g, '0');

  try {
    // 1. Try RapidAPI if configured
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST) {
      try {
        
        const options = {
          method: 'GET',
          url: `https://${process.env.RAPIDAPI_HOST}/`,
          params: { registrationNumber: normalizedPlate }, // Changed from license_plate to registrationNumber
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          }
        };

        const response = await axios.request(options);
        const data = response.data;
         // Log response for debugging

        // Check if API returned valid data
        if (data && (data.make || data.maker_name || data.model || data.maker_model)) {
          const mappedData = {
            make: data.maker_name || data.make || '',
            model: data.maker_model || data.model || '',
            variant: data.variant || data.vehicle_class || '',
            fuelType: data.fuel_type || data.fuel || '',
            year:
              parseInt(data.manufacturing_year) ||
              parseInt(data.reg_date?.split('-')[2]) ||
              new Date().getFullYear(),
            color: data.color || '',
            vin: data.chassis_no || data.vin || '',
            engineNumber: data.engine_no || '',
            registrationDate: data.reg_date || '',
          };
          return res.json({ found: true, ...mappedData });
        } else {
          return res.json({
            found: false,
            message: 'Vehicle details not found in API',
          });
        }
      } catch (apiError) {
        
        const status = apiError.response?.status;

        if (status === 404) {
          return res.json({
            found: false,
            message: 'Vehicle details not found in API',
          });
        }

        const message =
          apiError.response?.data?.message ||
          apiError.message ||
          'Failed to fetch from RapidAPI';

        return res.status(500).json({ message });
      }
    } else {
      return res.status(500).json({ message: 'RapidAPI not configured' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Add a vehicle
// @route   POST /api/vehicles
// @access  Private
export const addVehicle = async (req, res) => {
  const { licensePlate, make, model, variant, year, registrationDate, fuelType, type, color, image, vin, frontTyres, rearTyres, batteryDetails } = req.body;

  try {
    const vehicle = new Vehicle({
      user: req.user._id,
      licensePlate,
      make,
      model,
      variant,
      year,
      registrationDate,
      fuelType,
      type: type || 'Car',
      color,
      image,
      vin,
      frontTyres,
      rearTyres,
      batteryDetails
    });

    const createdVehicle = await vehicle.save();

    // Emit vehicle created event
    try {
      const io = (await import('../socket.js')).getIO();
      const payload = {
        vehicleId: createdVehicle._id,
        userId: createdVehicle.user,
        licensePlate: createdVehicle.licensePlate
      };
      io.to('admin').emit('vehicleCreated', payload);
      io.to(`user_${createdVehicle.user}`).emit('vehicleCreated', payload);
      
      // Global Real-time Sync
      emitEntitySync('vehicle', 'created', createdVehicle);
    } catch (err) {
      
    }

    res.status(201).json(createdVehicle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
      if (vehicle.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(401).json({ message: 'Not authorized' });
      }
      const vehicleId = vehicle._id;
      const userId = vehicle.user;

      await vehicle.deleteOne();

      // Emit vehicle deleted event
      try {
        const io = (await import('../socket.js')).getIO();
        const payload = {
          vehicleId,
          userId
        };
        io.to('admin').emit('vehicleDeleted', payload);
        io.to(`user_${userId}`).emit('vehicleDeleted', payload);
        
        // Global Real-time Sync
        emitEntitySync('vehicle', 'deleted', { _id: vehicleId, userId });
      } catch (err) {
        
      }

      res.json({ message: 'Vehicle removed' });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update vehicle health indicators
// @route   PUT /api/vehicles/:id/health
// @access  Private (Admin/Merchant)
export const updateVehicleHealth = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
      // Check if user is merchant or admin
      if (req.user.role !== 'admin' && req.user.role !== 'merchant') {
        return res.status(401).json({ message: 'Not authorized. Only Admin or Merchant can update health stats.' });
      }

      const { healthIndicators } = req.body;
      if (healthIndicators) {
        if (!vehicle.healthIndicators) {
          vehicle.healthIndicators = {};
        }

        const keys = ['generalService', 'brakePads', 'tires', 'battery', 'wiperBlade'];
        keys.forEach(key => {
          if (healthIndicators[key] !== undefined) {
            const indicator = healthIndicators[key];
            const existing = vehicle.healthIndicators[key] || {};
            
            // If newValue is 0, we treat it as a service reset
            // If it's not 0, we update it but maybe it's just a manual adjustment
            const newValue = typeof indicator === 'object' ? (indicator.value ?? 0) : indicator;
            const isReset = newValue === 0;

            vehicle.healthIndicators[key] = {
              value: newValue,
              lastUpdated: Date.now(),
              // Only update lastServiceDate/Km if it's a reset or it was never set
              lastServiceDate: isReset || !existing.lastServiceDate ? Date.now() : existing.lastServiceDate,
              lastServiceKm: isReset || !existing.lastServiceDate ? (vehicle.mileage || 0) : (existing.lastServiceKm || 0),
              fixedKm: typeof indicator === 'object' ? (indicator.fixedKm ?? existing.fixedKm ?? 0) : (existing.fixedKm ?? 0),
              fixedDays: typeof indicator === 'object' ? (indicator.fixedDays ?? existing.fixedDays ?? 0) : (existing.fixedDays ?? 0)
            };
          }
        });

        // Mark modified to ensure Mongoose saves the nested object
        vehicle.markModified('healthIndicators');
        const updatedVehicle = await vehicle.save();
        
        // Emit sync event
        emitEntitySync('vehicle', 'updated', updatedVehicle);
        
        res.json(updatedVehicle);
      } else {
        res.status(400).json({ message: 'No health indicators provided' });
      }
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

