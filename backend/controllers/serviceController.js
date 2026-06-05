import Service from '../models/Service.js';
import { emitEntitySync } from '../utils/syncService.js';

const MAX_CONSECUTIVE_CHARS = 10;

// Helper function to check for excessive repeated characters
const hasExcessiveRepeatedChars = (str) => {
  if (!str) return false;
  const regex = new RegExp(`(.)\\1{${MAX_CONSECUTIVE_CHARS},}`, 'g');
  return regex.test(str);
};

// Helper function to sanitize and validate input
const sanitizeAndValidateServiceData = (data, isUpdate = false) => {
  const errors = [];
  const sanitized = {};

  // Validate name
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!isUpdate || data.name !== undefined) {
      if (!name) {
        errors.push('Name is required');
      } else if (name.length > 20) {
        errors.push('Name cannot exceed 20 characters');
      } else if (hasExcessiveRepeatedChars(name)) {
        errors.push('Name has too many repeated characters');
      } else if (!/^[a-zA-Z0-9][a-zA-Z0-9\s'&-]*$/.test(name)) {
        errors.push('Name contains invalid characters');
      }
    }
    sanitized.name = name;
  }

  // Validate description
  if (data.description !== undefined) {
    const description = String(data.description).trim();
    if (!isUpdate || data.description !== undefined) {
      if (!description) {
        errors.push('Description is required');
      } else if (description.length > 500) {
        errors.push('Description cannot exceed 500 characters');
      } else if (hasExcessiveRepeatedChars(description)) {
        errors.push('Description has too many repeated characters');
      }
    }
    sanitized.description = description;
  }

  // Validate price
  if (data.price !== undefined) {
    const price = Number(data.price);
    if (isNaN(price) || price <= 0) {
      errors.push('Price must be a positive number');
    }
    sanitized.price = price;
  }

  // Validate duration
  if (data.duration !== undefined) {
    const duration = Number(data.duration);
    if (isNaN(duration) || duration <= 0) {
      errors.push('Duration must be a positive number (minutes)');
    }
    sanitized.duration = duration;
  }

  // Validate category
  const validCategories = ['Services', 'Periodic', 'Wash', 'Car Wash', 'Tyre & Battery', 'Tyres', 'Battery', 'Painting', 'Denting', 'Repair', 'Detailing', 'AC', 'Accessories', 'Essentials', 'Other'];
  if (data.category !== undefined) {
    if (!validCategories.includes(data.category)) {
      errors.push('Invalid category');
    }
    sanitized.category = data.category;
  }

  // Validate vehicle type
  if (data.vehicleType !== undefined) {
    if (data.vehicleType !== 'Car') {
      errors.push('Invalid vehicle type');
    }
    sanitized.vehicleType = data.vehicleType;
  }

  // Validate estimation time
  if (data.estimationTime !== undefined) {
    const estimationTime = String(data.estimationTime).trim();
    if (estimationTime.length > 3) {
      errors.push('Estimation time cannot exceed 3 characters');
    } else if (hasExcessiveRepeatedChars(estimationTime)) {
      errors.push('Estimation time has too many repeated characters');
    }
    sanitized.estimationTime = estimationTime;
  }

  // Validate image
  if (data.image !== undefined) {
    const image = String(data.image).trim();
    if (image.length > 500) {
      errors.push('Image URL cannot exceed 500 characters');
    }
    sanitized.image = image;
  }

  // Validate features
  if (data.features !== undefined) {
    if (!Array.isArray(data.features)) {
      errors.push('Features must be an array of strings');
    } else {
      const validatedFeatures = [];
      for (let i = 0; i < data.features.length; i++) {
        const feature = String(data.features[i]).trim();
        if (feature) {
          if (feature.length > 100) {
            errors.push(`Feature ${i + 1} cannot exceed 100 characters`);
          } else if (hasExcessiveRepeatedChars(feature)) {
            errors.push(`Feature ${i + 1} has too many repeated characters`);
          } else if (!/^[a-zA-Z0-9\s'-.,:/&]*$/.test(feature)) {
            errors.push(`Feature ${i + 1} contains invalid characters`);
          }
          validatedFeatures.push(feature);
        }
      }
      sanitized.features = validatedFeatures;
    }
  }

  // Validate isQuickService
  if (data.isQuickService !== undefined) {
    sanitized.isQuickService = Boolean(data.isQuickService);
  }

  return { sanitized, errors };
};

// @desc    Get all services
// @route   GET /api/services
// @access  Public
export const getServices = async (req, res) => {
  const { vehicleType, category, service, isQuickService } = req.query;
  try {
    const query = {};

    // Handle vehicleType (Default to Car as per requirement)
    query.vehicleType = 'Car';

    // Handle category
    if (category && category !== 'Cars') {
      query.category = category;
    }

    // Handle service name search
    if (service) {
      query.name = { $regex: service, $options: 'i' };
    }

    // Handle isQuickService filter
    if (isQuickService !== undefined) {
      query.isQuickService = isQuickService === 'true';
    }

    const services = await Service.find(query);
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private/Admin
export const createService = async (req, res) => {
  try {
    // Sanitize and validate all input data first
    const { sanitized, errors } = sanitizeAndValidateServiceData(req.body, false);

    // Check for validation errors
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors 
      });
    }

    // Create and save the service
    const service = new Service({
      ...sanitized,
      features: sanitized.features || [],
      isQuickService: sanitized.isQuickService || false,
    });

    const createdService = await service.save();
    
    // Global Real-time Sync
    emitEntitySync('service', 'created', createdService);
    
    res.status(201).json(createdService);
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private/Admin
export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Sanitize and validate input data
    const { sanitized, errors } = sanitizeAndValidateServiceData(req.body, true);

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors 
      });
    }

    // Update service fields
    Object.keys(sanitized).forEach(key => {
      service[key] = sanitized[key];
    });

    const updatedService = await service.save();
    
    // Global Real-time Sync
    emitEntitySync('service', 'updated', updatedService);
    
    res.json(updatedService);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid service ID' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private/Admin
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (service) {
      const serviceId = service._id;
      await service.deleteOne();
      
      // Global Real-time Sync
      emitEntitySync('service', 'deleted', { _id: serviceId });
      
      res.json({ message: 'Service removed' });
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid service ID' });
    }
    res.status(500).json({ message: error.message });
  }
};
