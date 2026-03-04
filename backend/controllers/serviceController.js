import Service from '../models/Service.js';

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
  const { name, description, price, duration, category, vehicleType, image, features, isQuickService } = req.body;

  try {
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!description) missingFields.push('description');
    if (typeof price !== 'number') missingFields.push('price (must be number)');
    if (typeof duration !== 'number') missingFields.push('duration (must be number)');
    if (!category) missingFields.push('category');
    if (!vehicleType) missingFields.push('vehicleType');

    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing or invalid fields: ${missingFields.join(', ')}` });
    }
    
    if (price < 0) {
      return res.status(400).json({ message: 'Price must be a positive number' });
    }
    if (duration <= 0) {
      return res.status(400).json({ message: 'Duration must be greater than 0 minutes' });
    }

    const service = new Service({
      name,
      description,
      price,
      duration,
      category,
      vehicleType,
      image,
      features: Array.isArray(features) ? features : [],
      isQuickService: isQuickService || false,
    });

    const createdService = await service.save();
    res.status(201).json(createdService);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private/Admin
export const updateService = async (req, res) => {
  const { name, description, price, duration, category, vehicleType, image, features, isQuickService } = req.body;

  try {
    const service = await Service.findById(req.params.id);

    if (service) {
      if (name !== undefined) service.name = name;
      if (description !== undefined) service.description = description;
      if (isQuickService !== undefined) service.isQuickService = isQuickService;
      if (price !== undefined) {
        if (typeof price !== 'number' || price < 0) {
          return res.status(400).json({ message: 'Price must be a positive number' });
        }
        service.price = price;
      }
      if (duration !== undefined) {
        if (typeof duration !== 'number' || duration <= 0) {
          return res.status(400).json({ message: 'Duration must be a positive number (minutes)' });
        }
        service.duration = duration;
      }
      if (category !== undefined) {
        if (!['Services', 'Periodic', 'Wash', 'Car Wash', 'Tyre & Battery', 'Tyres', 'Battery', 'Insurance', 'Painting', 'Denting', 'Repair', 'Detailing', 'AC', 'Accessories', 'Other'].includes(category)) {
           return res.status(400).json({ message: 'Invalid category' });
        }
        service.category = category;
      }
      if (vehicleType !== undefined) {
        if (vehicleType !== 'Car') {
           return res.status(400).json({ message: 'Invalid vehicle type' });
        }
        service.vehicleType = vehicleType;
      }
      if (image !== undefined) service.image = image;
      if (features !== undefined) {
        if (!Array.isArray(features)) {
          return res.status(400).json({ message: 'Features must be an array of strings' });
        }
        service.features = features.filter(f => f.trim() !== '');
      }

      const updatedService = await service.save();
      res.json(updatedService);
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
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
      await service.deleteOne();
      res.json({ message: 'Service removed' });
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
