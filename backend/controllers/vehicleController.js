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
        console.log(`Fetching details for ${normalizedPlate} from RapidAPI...`);
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
        console.log('RapidAPI Response:', JSON.stringify(data).substring(0, 500)); // Log response for debugging

        // Check if API returned valid data
        if (data && (data.make || data.maker_name || data.model || data.maker_model)) {
             // Map API response to our Schema
             const mappedData = {
               make: data.maker_name || data.make || '',
               model: data.maker_model || data.model || '',
               variant: data.variant || data.vehicle_class || '',
               fuelType: data.fuel_type || data.fuel || '',
               year: parseInt(data.manufacturing_year) || parseInt(data.reg_date?.split('-')[2]) || new Date().getFullYear(),
               color: data.color || '',
               vin: data.chassis_no || data.vin || '',
               engineNumber: data.engine_no || '',
               registrationDate: data.reg_date || ''
             };
             return res.json(mappedData);
        } else {
          return res.status(404).json({ message: 'Vehicle details not found in API' });
        }
      } catch (apiError) {
        console.error('RapidAPI Error details:', apiError.response?.data || apiError.message);
        const status = apiError.response?.status || 500;
        const message = apiError.response?.data?.message || apiError.message || 'Failed to fetch from RapidAPI';
        return res.status(status).json({ message });
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
  const { licensePlate, make, model, year, fuelType, type, color, image, vin } = req.body;

  try {
    const vehicle = new Vehicle({
      user: req.user._id,
      licensePlate,
      make,
      model,
      year,
      fuelType,
      type: type || 'Car',
      color,
      image,
      vin
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
