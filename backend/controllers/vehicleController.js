import Vehicle from '../models/Vehicle.js';
import axios from 'axios';

// ... (existing imports)

// @desc    Get all vehicles (Admin)
// @route   GET /api/vehicles/all
// @access  Private/Admin
export const getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({}).populate('user', 'name email phone');
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get vehicle by ID (Admin)
// @route   GET /api/vehicles/:id
// @access  Private/Admin
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('user', 'name email phone');
    if (vehicle) {
      res.json(vehicle);
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get vehicles by user ID (Admin)
// @route   GET /api/vehicles/user/:userId
// @access  Private/Admin
export const getUserVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.params.userId });
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
      await vehicle.deleteOne();
      res.json({ message: 'Vehicle removed' });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

