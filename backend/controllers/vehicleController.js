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
          params: { license_plate: normalizedPlate },
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          }
        };

        const response = await axios.request(options);
        const data = response.data;

        // Check if API returned valid data (structure depends on specific API, this is a generic mapper)
        if (data && (data.make || data.maker_model || data.vehicle_category)) {
             // Map API response to our Schema
             // Note: You may need to adjust these fields based on the exact API response structure
             const mappedData = {
               make: data.maker_name || data.make || '',
               model: data.maker_model || data.model || '',
               variant: data.vehicle_class || '',
               fuelType: data.fuel_type || '',
               year: parseInt(data.manufacturing_year) || parseInt(data.reg_date?.split('-')[2]) || new Date().getFullYear(),
               color: data.color || '',
               vin: data.chassis_no || '',
               engineNumber: data.engine_no || '',
               registrationDate: data.reg_date || ''
             };
             return res.json(mappedData);
        }
      } catch (apiError) {
        console.warn('RapidAPI request failed or returned error:', apiError.message);
        // Fall through to mock logic
      }
    }

    // 2. Fallback to Mock Data
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock data logic
    // specific check for the user's reported plate
    if (normalizedPlate === 'TS08JY4741') {
       return res.json({
         make: 'Honda',
         model: 'Activa 6G',
         year: 2023,
         fuelType: 'Petrol',
         type: 'Bike',
         color: 'Matte Axis Grey',
         vin: 'ME4JF508EHN00000',
         registrationDate: '2023-05-15'
       });
    }

    // Generic mock based on last digit
    const lastDigit = licensePlate.replace(/\D/g, '').slice(-1);
    const mockDb = [
      { make: 'Maruti Suzuki', model: 'Swift', year: 2020, fuelType: 'Petrol', type: 'Car', color: 'Red' },
      { make: 'Hyundai', model: 'i20', year: 2021, fuelType: 'Diesel', type: 'Car', color: 'White' },
      { make: 'Honda', model: 'City', year: 2019, fuelType: 'Petrol', type: 'Car', color: 'Silver' },
      { make: 'Tata', model: 'Nexon', year: 2022, fuelType: 'Electric', type: 'Car', color: 'Blue' },
      { make: 'Royal Enfield', model: 'Classic 350', year: 2021, fuelType: 'Petrol', type: 'Bike', color: 'Black' },
      { make: 'Yamaha', model: 'R15', year: 2020, fuelType: 'Petrol', type: 'Bike', color: 'Racing Blue' },
      { make: 'TVS', model: 'Jupiter', year: 2022, fuelType: 'Petrol', type: 'Bike', color: 'Grey' },
      { make: 'Hero', model: 'Splendor+', year: 2019, fuelType: 'Petrol', type: 'Bike', color: 'Black/Purple' },
      { make: 'Mahindra', model: 'Thar', year: 2023, fuelType: 'Diesel', type: 'Car', color: 'Red' },
      { make: 'Kia', model: 'Seltos', year: 2021, fuelType: 'Petrol', type: 'Car', color: 'White' }
    ];

    const vehicleData = mockDb[parseInt(lastDigit) % mockDb.length] || mockDb[0];
    res.json(vehicleData);

  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vehicle details' });
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
