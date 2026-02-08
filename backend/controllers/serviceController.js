import Service from '../models/Service.js';

// @desc    Get all services
// @route   GET /api/services
// @access  Public
export const getServices = async (req, res) => {
  const { vehicleType, category, service } = req.query;
  try {
    const query = {};

    // Handle vehicleType
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    // Handle category (frontend sends "Two Wheelers" or "Cars" as category, or actual backend categories)
    if (category) {
      if (category === 'Two Wheelers') {
        query.vehicleType = 'Bike';
      } else if (category === 'Cars') {
        query.vehicleType = 'Car';
      } else {
        query.category = category;
      }
    }

    // Handle service name search
    if (service) {
      query.name = service;
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
  const { name, description, price, duration, category, vehicleType, image, features } = req.body;

  try {
    const service = new Service({
      name,
      description,
      price,
      duration,
      category,
      vehicleType,
      image,
      features,
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
  const { name, description, price, duration, category, vehicleType, image, features } = req.body;

  try {
    const service = await Service.findById(req.params.id);

    if (service) {
      service.name = name || service.name;
      service.description = description || service.description;
      service.price = price || service.price;
      service.duration = duration || service.duration;
      service.category = category || service.category;
      service.vehicleType = vehicleType || service.vehicleType;
      service.image = image || service.image;
      service.features = features || service.features;

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
