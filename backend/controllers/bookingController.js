import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';
import { sendEmail } from '../utils/emailService.js';
import { normalizeStatus, isValidTransition } from '../utils/statusMachine.js';
import { sendPushToUser, sendPushToRole } from '../utils/pushService.js';
import crypto from 'crypto';
import Message from '../models/Message.js';

export const emitBookingUpdate = (booking) => {
  try {
    const io = getIO();
    const bookingId = booking._id.toString();
    
    // Notify admin
    io.to('admin').emit('bookingUpdated', booking);
    
    // Also notify admin specifically about new bookings
    if (booking.status === 'CREATED') {
      io.to('admin').emit('bookingCreated', booking);
      
      // Save notification to history and send push to admins
      sendPushToRole(
        'admin',
        'New Booking Received',
        `A new booking (#${booking.orderNumber || bookingId.slice(-6).toUpperCase()}) has been created.`,
        { bookingId, type: 'order' },
        'order'
      );
    } else if (booking.status === 'CANCELLED') {
      io.to('admin').emit('bookingCancelled', booking);
      
      sendPushToRole(
        'admin',
        'Booking Cancelled',
        `Booking #${booking.orderNumber || bookingId.slice(-6).toUpperCase()} has been cancelled.`,
        { bookingId, type: 'order' },
        'order'
      );
    }
    
    // Notify specific booking room
    io.to(`booking_${bookingId}`).emit('bookingUpdated', booking);
    
    // Notify relevant users
    const usersToNotify = [
      booking.user?._id || booking.user,
      booking.merchant?._id || booking.merchant,
      booking.pickupDriver?._id || booking.pickupDriver,
      booking.technician?._id || booking.technician,
      booking.carWash?.staffAssigned?._id || booking.carWash?.staffAssigned,
    ].filter(id => id); // Remove null/undefined

    usersToNotify.forEach(userId => {
      const room = `user_${userId.toString()}`;
      io.to(room).emit('bookingUpdated', booking);
      io.to(room).emit('bookingCreated', booking); // Also emit bookingCreated for compatibility
    });
  } catch (err) {
    // Error handling
  }
};

// Helper function to check if booking is for battery or tire service
const isBatteryOrTireBooking = async (booking) => {
  try {
    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: booking.services } });
    return services.some(service => 
      service.category === 'Battery' ||
      service.category === 'Tyres' ||
      service.category === 'Tyre & Battery'
    );
  } catch (error) {
    return false;
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  const { vehicleId, serviceIds, date, notes, location } = req.body;

  try {
    // Pickup address is now always required
    const hasAddress = location && typeof location.address === 'string' && location.address.trim().length > 0;
    if (!hasAddress) {
      return res.status(400).json({ message: 'Pickup address is required' });
    }

    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: serviceIds } });

    if (services.length !== serviceIds.length) {
      return res.status(404).json({ message: 'One or more services not found' });
    }

    const totalAmount = services.reduce((acc, service) => acc + service.price, 0);

    // Check if this is a service that requires payment (Car Wash, Battery, or Tires)
    const requiresPaymentService = services.some(service => 
      service.category === 'Car Wash' || 
      service.category === 'Wash' ||
      service.category === 'Battery' ||
      service.category === 'Tyres' ||
      service.category === 'Tyre & Battery'
    );

    // For services requiring payment, store booking data temporarily and require payment first
    if (requiresPaymentService) {
      // Store booking data in session/temporary storage for payment processing
      const tempBookingData = {
        user: req.user._id,
        vehicleId: vehicleId,
        serviceIds: serviceIds,
        date,
        notes,
        location,
        totalAmount,
        requiresPaymentService: true
      };

      // Return temporary booking data for payment processing
      res.status(201).json({
        tempBookingId: `temp_${Date.now()}_${req.user._id}`,
        ...tempBookingData,
        requiresPayment: true,
        message: 'Service booking prepared. Please complete payment to create the booking.'
      });

      return; // Exit early for payment-required services - no actual booking created yet
    }

    // Regular service booking flow (existing logic)
    const MAX_RETRIES = 5;
    let lastError = null;
    let createdBooking = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const orderNumber = await Counter.next('booking');
        
        // Check if this is a battery or tire service
        const isBatteryTireService = services.some(service => 
          service.category === 'Battery' ||
          service.category === 'Tyres' ||
          service.category === 'Tyre & Battery'
        );
        
        const booking = new Booking({
          user: req.user._id,
          vehicle: vehicleId,
          services: serviceIds,
          date,
          orderNumber,
          notes,
          location,
          totalAmount,
          // Mark as battery/tire service if applicable
          ...(isBatteryTireService && {
            batteryTire: {
              isBatteryTireService: true,
              merchantApproval: {
                status: 'PENDING'
              }
            }
          })
        });

        createdBooking = await booking.save();
        
        // Notify nearby drivers (staff)
        try {
          const drivers = await User.find({
            role: 'staff',
            subRole: 'Driver',
            'fcmTokens.0': { $exists: true }
          });

          for (const driver of drivers) {
            await sendPushToUser(
              driver._id,
              'New Booking Available!',
              `A new service request (#${createdBooking.orderNumber}) is waiting near you.`,
              { bookingId: createdBooking._id.toString(), type: 'order' },
              'order'
            );
          }
        } catch (err) {
          
        }

        break;
      } catch (err) {
        lastError = err;
        // Retry on duplicate orderNumber, otherwise abort
        // MongoServerError code 11000 is duplicate key
        const isDuplicate =
          err &&
          err.code === 11000 &&
          (err.keyPattern?.orderNumber || String(err.message || '').includes('orderNumber_1'));

        if (!isDuplicate) {
          throw err;
        }

        // Align counter with current max orderNumber to avoid repeated collisions
        try {
          const lastWithOrder = await Booking.findOne({ orderNumber: { $ne: null } })
            .sort({ orderNumber: -1 })
            .select('orderNumber')
            .lean();
          if (lastWithOrder && typeof lastWithOrder.orderNumber === 'number') {
            await Counter.findOneAndUpdate(
              { name: 'booking' },
              { $set: { seq: lastWithOrder.orderNumber } },
              { upsert: true }
            );
          }
        } catch (alignError) {
          
        }
      }
    }

    if (!createdBooking) {
      throw lastError || new Error('Failed to create booking with unique order number');
    }
    
    // Send confirmation email (asynchronously)
    if (req.user.email) {
      const serviceNames = services.map(s => s.name).join(', ');
      sendEmail(
        req.user.email,
        'Booking Confirmation - DriveFlow',
        `Dear User,\n\nYour booking for ${serviceNames} has been successfully created.\nDate: ${new Date(date).toLocaleDateString()}\nTotal Amount: ₹${totalAmount}\n\nThank you for choosing DriveFlow!`
      ).catch(() => {});
    }

    res.status(201).json(createdBooking);

    // Send push to customer
    try {
      await sendPushToUser(
        req.user._id,
        'Booking Successful',
        `Your booking (#${createdBooking.orderNumber}) has been successfully created.`,
        { bookingId: createdBooking._id.toString(), type: 'order' },
        'order'
      );
    } catch (err) {
      
    }

    // Emit socket event for real-time updates
    try {
      // Populate for real-time consumers
      const populated = await Booking.findById(createdBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services');
        
      emitBookingUpdate(populated || createdBooking);
    } catch (err) {
      
    }
  } catch (error) {
    
    
    if (error.name === 'ValidationError') {
       const messages = Object.values(error.errors).map(val => val.message);
       return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/mybookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    let query = { user: req.user._id };

    if (req.user.role === 'staff') {
      // Staff see bookings where they are the pickup driver, technician, OR assigned to car wash
      query = { 
        $or: [
          { pickupDriver: req.user._id },
          { technician: req.user._id },
          { 'carWash.staffAssigned': req.user._id }
        ]
      };
    } else if (req.user.role === 'merchant') {
      // Merchants see bookings assigned to them, and their own personal bookings
      query = {
        $or: [
          { user: req.user._id },
          { merchant: req.user._id }
        ]
      };
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('user', 'name email phone location')
      .populate('pickupDriver', 'name email phone')
      .populate('carWash.staffAssigned', 'name email phone')
      .lean();
    res.json(bookings);
  } catch (error) {
    
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings by user ID (Admin)
// @route   GET /api/bookings/user/:userId
// @access  Private/Admin
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('vehicle')
      .populate('services')
      .lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings by vehicle ID (Admin)
// @route   GET /api/bookings/vehicle/:vehicleId
// @access  Private/Admin
export const getVehicleBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ vehicle: req.params.vehicleId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'id name email')
      .populate('services')
      .lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings by merchant ID
// @route   GET /api/bookings/merchant/:merchantId
// @access  Private/Admin or Merchant
export const getMerchantBookings = async (req, res) => {
  try {
    // Check if user is authorized (admin or the merchant itself)
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.merchantId) {
      return res.status(403).json({ message: 'Not authorized to access these bookings' });
    }

    const bookings = await Booking.find({ merchant: req.params.merchantId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'id name email')
      .populate('vehicle', 'make model licensePlate')
      .populate('services')
      .lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin
export const getAllBookings = async (req, res) => {
  try {
    let query = {};
    
    // If merchant, only show their bookings
    if (req.user.role === 'merchant') {
      query = { merchant: req.user._id };
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone')
      .populate('pickupDriver', 'name email phone')
      .populate('technician', 'name email phone')
      .lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get booking by ID (Admin)
// @route   GET /api/bookings/:id
// @access  Private/Admin
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('pickupDriver', 'name email phone')
      .populate('technician', 'name email phone')
      .populate('carWash.staffAssigned', 'name email phone');
    
    if (booking) {
      // Check if user is authorized (admin, merchant, or booking owner)
      const isOwner = booking.user && booking.user._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant._id.toString() === req.user._id.toString();
      const isAssignedStaff = req.user.role === 'staff' && (
        (booking.pickupDriver && booking.pickupDriver._id.toString() === req.user._id.toString()) ||
        (booking.technician && booking.technician._id.toString() === req.user._id.toString()) ||
        (booking.carWash?.staffAssigned && booking.carWash.staffAssigned._id.toString() === req.user._id.toString())
      );
      
      if (isOwner || isAdmin || isAssignedMerchant || isAssignedStaff) {
        res.json(booking);
      } else {
        res.status(401).json({ message: 'Not authorized to view this booking' });
      }
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update booking details (Assign staff/merchant)
// @route   PUT /api/bookings/:id/assign
// @access  Private/Admin
export const assignBooking = async (req, res) => {
  const { merchantId, driverId, technicianId, slot, carWashStaffId } = req.body;
  const bookingId = req.params.id;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    

    const updateData = {};
    if (slot) updateData.date = slot;

    // Direct assignment updates
    if (merchantId) updateData.merchant = merchantId;
    if (driverId) updateData.pickupDriver = driverId;
    if (technicianId) updateData.technician = technicianId;
    
    // Handle Car Wash Staff
    if (carWashStaffId) {
      updateData['carWash.staffAssigned'] = carWashStaffId;
      // Mark as car wash service if assigning staff to it
      updateData['carWash.isCarWashService'] = true;
    }

    // Battery/Tire specific logic
    const isBatteryTire = await isBatteryOrTireBooking(booking);
    if (isBatteryTire) {
      updateData['batteryTire.isBatteryTireService'] = true;
      // For battery/tire services, if an admin is assigning staff or merchant,
      // it should be automatically approved so staff can proceed.
      updateData['batteryTire.merchantApproval.status'] = 'APPROVED';
      updateData['batteryTire.merchantApproval.approvedAt'] = new Date();
    }

    // CRITICAL: Status transition to ASSIGNED
    // If status is CREATED and we have ANY assignment (old or new), move to ASSIGNED
    const hasAnyAssignment = !!(
      merchantId || 
      driverId || 
      technicianId || 
      carWashStaffId || 
      booking.merchant || 
      booking.pickupDriver || 
      booking.technician || 
      booking.carWash?.staffAssigned
    );

    if (booking.status === 'CREATED' && hasAnyAssignment) {
      updateData.status = 'ASSIGNED';
      
    }

    

    // Apply updates directly to database to avoid middleware/validation pitfalls of save()
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
    .populate('user', 'id name email phone')
    .populate('vehicle')
    .populate('services')
    .populate('merchant', 'name email phone location')
    .populate('pickupDriver', 'name email phone')
    .populate('technician', 'name email phone')
    .populate('carWash.staffAssigned', 'name email phone');

    if (!updatedBooking) throw new Error('Failed to retrieve updated booking');

    // Broadcast the update via socket
    emitBookingUpdate(updatedBooking);

    // Notifications
    try {
      const orderId = updatedBooking.orderNumber || String(updatedBooking._id).slice(-6).toUpperCase();
      
      // Notify Merchant
      if (updatedBooking.merchant?._id && merchantId) {
        await sendPushToUser(
          updatedBooking.merchant._id, 
          'New Assignment', 
          `You have been assigned to booking #${orderId}`, 
          { type: 'assignment', role: 'merchant', bookingId }, 
          'order'
        );
      }

      // Notify Staff (Driver, Technician, or Car Wash Staff)
      const staffId = driverId || technicianId || carWashStaffId;
      if (staffId) {
        await sendPushToUser(
          staffId, 
          'New Assignment', 
          `You have been assigned to booking #${orderId}`, 
          { type: 'assignment', role: 'staff', bookingId }, 
          'order'
        );
      }

      // Notify Customer
      if (updatedBooking.user?._id) {
        await sendPushToUser(
          updatedBooking.user._id, 
          'Service Assigned', 
          `Your service #${orderId} has been updated.`, 
          { type: 'assignment_update', bookingId }, 
          'order'
        );
      }
    } catch (notifyErr) {
      
    }

    res.json(updatedBooking);
  } catch (error) {
    
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin/Garage
export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const booking = await Booking.findById(req.params.id).populate('user');

    if (booking) {
      const isOwner = booking.user && booking.user._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant.toString() === req.user._id.toString();
      const isAssignedStaff = req.user.role === 'staff' && (
        (booking.pickupDriver && booking.pickupDriver.toString() === req.user._id.toString()) ||
        (booking.technician && booking.technician.toString() === req.user._id.toString()) ||
        (booking.carWash?.staffAssigned && booking.carWash.staffAssigned.toString() === req.user._id.toString())
      );

      if (isOwner && !isAdmin && !isAssignedMerchant && !isAssignedStaff) {
        const allowedStatuses = ['DELIVERED'];
        if (!allowedStatuses.includes(status)) {
          return res.status(401).json({ message: 'Not authorized to set this status' });
        }
      } else if (!isAdmin && !isAssignedMerchant && !isAssignedStaff) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      const canonFrom = booking.status;
      const canonTo = normalizeStatus(status) || status;

      if (!canonTo) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      if (!isValidTransition(canonFrom, canonTo)) {
        // Allow if admin overrides, otherwise block
        if (req.user.role !== 'admin') {
          return res.status(400).json({ message: `Invalid transition from ${canonFrom} to ${canonTo}` });
        }
      }

      if (canonTo === 'SERVICE_COMPLETED') {
        if (req.user.role === 'staff') {
          return res.status(401).json({ message: 'Only merchant can mark service as completed' });
        }
        if (!booking.inspection?.completedAt) {
          return res.status(400).json({ message: 'Please complete inspection before marking service as completed' });
        }
        if (!booking.qc?.completedAt) {
          return res.status(400).json({ message: 'Please complete QC before marking service as completed' });
        }
        if (!booking.billing?.fileUrl) {
          return res.status(400).json({ message: 'Please upload invoice before marking service as completed' });
        }
      }

      if (canonTo === 'VEHICLE_PICKED') {
        const photos = Array.isArray(booking.prePickupPhotos) ? booking.prePickupPhotos : [];
        if (photos.length < 4) {
          return res.status(400).json({ message: 'Please upload 4 vehicle photos before picking up the vehicle' });
        }
      }

      // Car wash specific photo requirements
      if (canonTo === 'CAR_WASH_STARTED') {
        const beforePhotos = Array.isArray(booking.carWash?.beforeWashPhotos) ? booking.carWash.beforeWashPhotos : [];
        if (beforePhotos.length < 2) {
          return res.status(400).json({ message: 'Please upload at least 2 before wash photos before starting car wash' });
        }
        
        // Set wash start time
        if (booking.carWash) {
          booking.carWash.washStartedAt = new Date();
        }
      }

      if (canonTo === 'CAR_WASH_COMPLETED') {
        
        const afterPhotos = Array.isArray(booking.carWash?.afterWashPhotos) ? booking.carWash.afterWashPhotos : [];
        
        if (afterPhotos.length < 2) {
          return res.status(400).json({ message: 'Please upload at least 2 after wash photos before completing car wash' });
        }
        
        // Set wash completion time and generate OTP for delivery
        if (booking.carWash) {
          booking.carWash.washCompletedAt = new Date();
          
          // Generate OTP for car wash delivery
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          booking.deliveryOtp = {
            code,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            attempts: 0,
            verifiedAt: null
          };
          
          if (booking.user?.email) {
            await sendEmail(
              booking.user.email,
              'Car Wash Completion & Delivery OTP',
              `Your OTP for car wash delivery is ${code}. It expires in 24 hours.`
            ).catch(() => {});
          }
          await sendPushToUser(booking.user?._id, 'Car Wash Completed', `Your car wash is completed. Use OTP ${code} to confirm delivery.`, { type: 'otp', bookingId: String(booking._id) }).catch(() => {});
        }
      }

      // Battery and Tire specific validations
      const isBatteryTireService = await isBatteryOrTireBooking(booking);
      
      if (isBatteryTireService) {
        // Check merchant approval for battery/tire services
        if (canonTo === 'STAFF_REACHED_MERCHANT') {
          // If a merchant is assigned, we allow proceeding even if not explicitly approved by merchant
          // because admin assignment implies approval for these services.
          if (booking.batteryTire?.merchantApproval?.status !== 'APPROVED' && !booking.merchant) {
            return res.status(400).json({ message: 'Merchant must be assigned before staff can proceed to merchant location' });
          }
        }
        
        // For battery/tire services, generate OTP for delivery step
        if (canonTo === 'INSTALLATION') {
          const photos = Array.isArray(booking.prePickupPhotos) ? booking.prePickupPhotos : [];
          if (photos.length < 2) {
            return res.status(400).json({ message: 'Please upload at least 2 photos (Old Part and New Part) before starting installation' });
          }

          const code = Math.floor(1000 + Math.random() * 9000).toString();
          booking.deliveryOtp = {
            code,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            attempts: 0,
            verifiedAt: null
          };
          if (booking.user?.email) {
            await sendEmail(
            booking.user.email,
            'Installation & Delivery OTP',
            `Your OTP for battery/tire installation and delivery is ${code}. It expires in 24 hours.`
          ).catch(() => {});
        }
        await sendPushToUser(booking.user?._id, 'Delivery OTP', 'Use the OTP to confirm installation completion', { type: 'otp', bookingId: String(booking._id) }).catch(() => {});
      }

        if (canonTo === 'DELIVERY') {
          const photos = Array.isArray(booking.prePickupPhotos) ? booking.prePickupPhotos : [];
          if (photos.length < 2) {
            return res.status(400).json({ message: 'Please upload at least 2 photos (New Part and Old Part) before starting delivery' });
          }
        }

        if (canonTo === 'COMPLETED') {
          if (!booking.deliveryOtp || !booking.deliveryOtp.verifiedAt) {
            return res.status(400).json({ message: 'OTP verification required before marking as COMPLETED' });
          }
        }
      }

      // OTP gating for delivery
      if (canonTo === 'OUT_FOR_DELIVERY') {
        const code = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 4);
        booking.deliveryOtp = {
          code,
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
          attempts: 0,
          verifiedAt: null
        };
        if (booking.user?.email) {
          await sendEmail(
            booking.user.email,
            'Delivery OTP',
            `Your OTP for vehicle delivery is ${code}. It expires in 20 minutes.`
          );
        }
        await sendPushToUser(booking.user?._id, 'Delivery OTP', 'Use the OTP to confirm delivery', { type: 'otp', bookingId: String(booking._id) });
      }

      if (canonTo === 'DELIVERED') {
        if (!booking.deliveryOtp || !booking.deliveryOtp.verifiedAt) {
          return res.status(400).json({ message: 'OTP verification required before marking as DELIVERED' });
        }
      }

      // Stock Auto Adjustment
      if (((canonTo === 'SERVICE_COMPLETED') && 
          !['SERVICE_COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(booking.status)) ||
          (isBatteryTireService && canonTo === 'COMPLETED' && 
          !['COMPLETED'].includes(booking.status))) {
          
          const Product = (await import('../models/Product.js')).default;
          const Notification = (await import('../models/Notification.js')).default;
          
          if (Array.isArray(booking.parts)) {
            for (const part of booking.parts) {
                if (part.product) {
                    const product = await Product.findById(part.product);
                    if (product) {
                        product.quantity = Math.max(0, product.quantity - part.quantity);
                        await product.save();
                        
                        // Check for low stock
                        if (product.quantity <= product.threshold) {
                            // Trigger alert (Create a notification)
                            await Notification.create({
                                user: product.merchant,
                                title: 'Low Stock Alert',
                                message: `Product ${product.name} is running low on stock (${product.quantity} left).`,
                                type: 'system'
                            });
                        }
                    }
                }
            }
          }
      }

      booking.status = canonTo;
      const savedBooking = await booking.save();

      // Populate fields before returning to frontend
      const updatedBooking = await Booking.findById(savedBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('merchant', 'name email phone location')
        .populate('pickupDriver', 'name email phone')
        .populate('technician', 'name email phone')
        .populate('carWash.staffAssigned', 'name email phone');

      // Emit socket event for real-time updates
      emitBookingUpdate(updatedBooking);

      if (canonTo === 'CANCELLED' && booking.user) {
        try {
          const io = getIO();
          const userId = typeof booking.user === 'object' ? booking.user._id : booking.user;
          io.to(`user_${userId}`).emit('bookingCancelled', { id: updatedBooking._id, status: 'CANCELLED' });
        } catch (err) {
          
        }
      }

      // Send status update email
      if (updatedBooking.user && updatedBooking.user.email) {
        sendEmail(
          updatedBooking.user.email,
          'Booking Status Update - Speshway',
          `Dear ${updatedBooking.user.name},\n\nYour booking status has been updated to: ${canonTo}.\n\nCheck your dashboard for more details.`
        ).catch(() => {});
      }
      sendPushToUser(updatedBooking.user?._id, 'Booking Update', `Your booking status is now: ${canonTo}`, { type: 'status', status: canonTo, bookingId: String(updatedBooking._id) }).catch(() => {});

      res.json(updatedBooking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate delivery OTP
// @route   POST /api/bookings/:id/generate-otp
// @access  Private/Staff/Admin
export const generateDeliveryOtp = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssignedStaff = req.user.role === 'staff' && (
      (booking.pickupDriver && booking.pickupDriver.toString() === req.user._id.toString()) ||
      (booking.technician && booking.technician.toString() === req.user._id.toString()) ||
      (booking.carWash?.staffAssigned && booking.carWash.staffAssigned.toString() === req.user._id.toString())
    );
    if (!isAdmin && !isAssignedStaff) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Check if OTP already exists and is still valid
    const existingOtp = booking.deliveryOtp;
    const now = new Date();
    
    if (existingOtp && existingOtp.code && existingOtp.expiresAt && new Date(existingOtp.expiresAt) > now) {
      
      return res.json({ message: 'OTP already exists', code: existingOtp.code });
    }

    // Generate new OTP only if none exists or expired
    const code = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 4);
    
    booking.deliveryOtp = {
      code,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      attempts: 0,
      verifiedAt: null
    };
    await booking.save();

    if (booking.user?.email) {
      await sendEmail(
        booking.user.email,
        'Delivery OTP',
        `Your OTP for vehicle delivery is ${code}. It expires in 20 minutes.`
      );
    }
    await sendPushToUser(booking.user?._id, 'Delivery OTP', 'Use the OTP to confirm delivery', { type: 'otp', bookingId: String(booking._id) });
    
    // Emit socket update so customer sees the OTP immediately
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');
    emitBookingUpdate(populated);
    
    res.json({ message: 'OTP generated', code });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateMessageApprovalStatus = async (req, res) => {
  const { messageId } = req.params;
  const { status } = req.body;

  try {
    const message = await Message.findById(messageId);

    if (!message || message.type !== 'approval') {
      return res.status(404).json({ message: 'Approval message not found' });
    }

    message.approval.status = status;
    await message.save();

    const populatedMessage = await message.populate('sender', '_id name role');

    getIO().to(`booking_${message.bookingId}`).emit('receiveMessage', populatedMessage);

    res.json(populatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Verify delivery OTP
// @route   POST /api/bookings/:id/verify-otp
// @access  Private/Staff/Admin/Customer
export const verifyDeliveryOtp = async (req, res) => {
  const { otp } = req.body;
  try {
    const booking = await Booking.findById(req.params.id).populate('user');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.deliveryOtp || !booking.deliveryOtp.code) return res.status(400).json({ message: 'No OTP generated' });

    const now = new Date();
    if (booking.deliveryOtp.expiresAt && booking.deliveryOtp.expiresAt < now) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    booking.deliveryOtp.attempts = (booking.deliveryOtp.attempts || 0) + 1;
    if (booking.deliveryOtp.attempts > 5) {
      return res.status(429).json({ message: 'Too many attempts' });
    }
    if (String(otp) !== booking.deliveryOtp.code) {
      await booking.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Mark OTP as verified
    booking.deliveryOtp.verifiedAt = now;
    
    // Check if it's a battery or tire service to set the correct final status
    const isBatteryTireService = await isBatteryOrTireBooking(booking);
    
    // Update status to COMPLETED for battery/tire, otherwise DELIVERED
    booking.status = isBatteryTireService ? 'COMPLETED' : 'DELIVERED';
    await booking.save();
    
    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('pickupDriver', 'name email phone')
      .populate('technician', 'name email phone')
      .populate('carWash.staffAssigned', 'name email phone');

    // Emit socket event for real-time updates
    emitBookingUpdate(populated);
    
    
    res.json({ message: 'OTP verified and delivery completed', booking: populated });
  } catch (e) {
    
    res.status(500).json({ message: e.message });
  }
};

// @desc    Update booking details (media, parts, notes, inspection, qc, etc.)
// @route   PUT /api/bookings/:id/details
// @access  Private/Merchant/Admin
export const updateBookingDetails = async (req, res) => {
  const { 
    media, 
    parts, 
    notes,
    prePickupPhotos,
    inspection,
    delay,
    serviceExecution,
    qc,
    billing,
    revisit
  } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);

    if (booking) {
      const isAdmin = req.user.role === 'admin';
      const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant.toString() === req.user._id.toString();
      const isAssignedStaff = req.user.role === 'staff' && (
        (booking.pickupDriver && booking.pickupDriver.toString() === req.user._id.toString()) ||
        (booking.technician && booking.technician.toString() === req.user._id.toString()) ||
        (booking.carWash?.staffAssigned && booking.carWash.staffAssigned.toString() === req.user._id.toString())
      );

      if (!isAdmin && !isAssignedMerchant && !isAssignedStaff) {
        return res.status(401).json({ message: 'Not authorized to update this booking' });
      }

      if (media) booking.media = media;
      if (notes) booking.notes = notes;
      if (prePickupPhotos) booking.prePickupPhotos = prePickupPhotos;
      
      if (inspection) {
        Object.assign(booking.inspection, inspection);
        booking.markModified('inspection');
      }
      if (delay) {
        Object.assign(booking.delay, delay);
        booking.markModified('delay');
      }
      if (serviceExecution) {
        Object.assign(booking.serviceExecution, serviceExecution);
        booking.markModified('serviceExecution');
      }
      if (qc) {
        Object.assign(booking.qc, qc);
        booking.markModified('qc');
      }
      if (billing) {
        Object.assign(booking.billing, billing);
        if (billing.total) {
          booking.totalAmount = billing.total;
        }
        booking.markModified('billing');

        // If submitting a bill, also mark the service as completed
        if (booking.status === 'SERVICE_STARTED') {
          booking.status = 'SERVICE_COMPLETED';
        }
      }
      if (revisit) {
        Object.assign(booking.revisit, revisit);
        booking.markModified('revisit');
      }
      
      if (parts) {
        booking.parts = parts;
        
        // Recalculate total amount
        const partsTotal = parts.reduce((acc, part) => acc + (part.price * part.quantity), 0);
        
        const Service = (await import('../models/Service.js')).default;
        const services = await Service.find({ _id: { $in: booking.services } });
        const servicesTotal = services.reduce((acc, service) => acc + service.price, 0);
        
        booking.totalAmount = servicesTotal + partsTotal;
        
        // Update billing partsTotal if billing exists
        if (booking.billing) {
            booking.billing.partsTotal = partsTotal;
            booking.billing.total = servicesTotal + partsTotal + (booking.billing.labourCost || 0) + (booking.billing.gst || 0);
        }
      }

      const updatedBooking = await booking.save();
      
      // Populate fields before returning to frontend
      const populated = await Booking.findById(updatedBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('merchant', 'name email phone location')
        .populate('pickupDriver', 'name email phone')
        .populate('technician', 'name email phone')
        .populate('carWash.staffAssigned', 'name email phone');

      // Emit socket event for real-time updates
      emitBookingUpdate(populated);

      const bookingIdStr = String(populated._id);
      // Notify customer of significant changes (e.g., billing update)
      if (billing && populated.user?._id) {
        await sendPushToUser(
          populated.user._id,
          'Bill Updated',
          `The bill for your booking #${populated.orderNumber || bookingIdStr.slice(-6).toUpperCase()} has been updated.`,
          { type: 'billing_update', bookingId: bookingIdStr }
        );
      }

      res.json(populated);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Car wash specific endpoints
export const uploadCarWashBeforePhotos = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { photos } = req.body; // Array of photo URLs

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.carWash?.isCarWashService) {
      return res.status(400).json({ message: 'This is not a car wash service' });
    }

    // Check if user is assigned staff
    if (booking.carWash.staffAssigned?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to upload photos for this booking' });
    }

    // Limit to 4 photos
    if (photos.length > 4) {
      return res.status(400).json({ message: 'Maximum 4 photos allowed' });
    }

    // Ensure carWash object exists
    if (!booking.carWash) {
      booking.carWash = { isCarWashService: true };
    }

    booking.carWash.beforeWashPhotos = photos;
    await booking.save();

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');

    emitBookingUpdate(populated);

    res.json({ message: 'Before wash photos uploaded successfully', booking: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const startCarWash = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.carWash?.isCarWashService) {
      return res.status(400).json({ message: 'This is not a car wash service' });
    }

    // Check if user is assigned staff
    if (booking.carWash.staffAssigned?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to start car wash for this booking' });
    }

    // Check if before photos are uploaded
    if (!booking.carWash.beforeWashPhotos || booking.carWash.beforeWashPhotos.length === 0) {
      return res.status(400).json({ message: 'Please upload before wash photos first' });
    }

    booking.status = 'CAR_WASH_STARTED';
    booking.carWash.washStartedAt = new Date();
    await booking.save();

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');

    emitBookingUpdate(populated);

    // Notify customer
    try {
      await sendPushToUser(
        booking.user,
        'Car Wash Started',
        `Your car wash service (#${booking.orderNumber}) has been started.`,
        { bookingId: booking._id.toString(), type: 'car_wash_started' },
        'order'
      );
    } catch (err) {
      
    }

    res.json({ message: 'Car wash started successfully', booking: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const uploadCarWashAfterPhotos = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { photos } = req.body; // Array of photo URLs

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.carWash?.isCarWashService) {
      return res.status(400).json({ message: 'This is not a car wash service' });
    }

    // Check if user is assigned staff
    if (booking.carWash.staffAssigned?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to upload photos for this booking' });
    }

    if (booking.status !== 'CAR_WASH_STARTED') {
      return res.status(400).json({ message: 'Car wash must be started before uploading after photos' });
    }

    // Limit to 4 photos
    if (photos.length > 4) {
      return res.status(400).json({ message: 'Maximum 4 photos allowed' });
    }

    // Ensure carWash object exists
    if (!booking.carWash) {
      booking.carWash = { isCarWashService: true };
    }

    booking.carWash.afterWashPhotos = photos;
    await booking.save();

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');

    emitBookingUpdate(populated);

    res.json({ message: 'After wash photos uploaded successfully', booking: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const completeCarWash = async (req, res) => {
  try {
    const { bookingId } = req.params;
    

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      
      return res.status(404).json({ message: 'Booking not found' });
    }

    

    if (!booking.carWash?.isCarWashService) {
      
      return res.status(400).json({ message: 'This is not a car wash service' });
    }

    // Check if user is assigned staff
    if (booking.carWash.staffAssigned?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      
      return res.status(403).json({ message: 'Not authorized to complete car wash for this booking' });
    }

    if (booking.status !== 'CAR_WASH_STARTED') {
      
      return res.status(400).json({ message: 'Car wash must be started before completion' });
    }

    // Check if after photos are uploaded
    const afterPhotos = Array.isArray(booking.carWash?.afterWashPhotos) ? booking.carWash.afterWashPhotos : [];
    if (afterPhotos.length < 4) {
      
      return res.status(400).json({ message: 'Please upload 4 after wash photos before completing car wash' });
    }

    booking.status = 'CAR_WASH_COMPLETED';
    booking.carWash.washCompletedAt = new Date();
    await booking.save();

    // Generate delivery OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    booking.deliveryOtp = {
      code: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0
    };
    await booking.save();
    

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');

    

    emitBookingUpdate(populated);

    // Notify customer with OTP
    try {
      
      const pushResult = await sendPushToUser(
        booking.user,
        'Car Wash Completed',
        `Your car wash service (#${booking.orderNumber}) is completed! Your delivery OTP is: ${otpCode}`,
        { bookingId: booking._id.toString(), type: 'car_wash_completed', otp: otpCode },
        'order'
      );
      
    } catch (err) {
      
    }

    res.json({ 
      message: 'Car wash completed successfully', 
      booking: populated,
      deliveryOtp: otpCode 
    });
  } catch (error) {
    
    res.status(400).json({ message: error.message });
  }
};

export const getCarWashBookings = async (req, res) => {
  try {
    let query = { 'carWash.isCarWashService': true };

    // If staff user, show only their assigned bookings
    if (req.user.role === 'staff') {
      query['carWash.staffAssigned'] = req.user._id;
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Merchant approval/rejection for battery/tire services
// @route   PUT /api/bookings/:id/battery-tire-approval
// @access  Private (Merchant only)
export const batteryTireApproval = async (req, res) => {
  const { status, price, image, notes } = req.body;

  try {
    const booking = await Booking.findById(req.params.id).populate('merchant');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if this is a battery/tire service
    if (!booking.batteryTire?.isBatteryTireService) {
      return res.status(400).json({ message: 'This is not a battery/tire service' });
    }

    // Check if user is the assigned merchant
    const isAssignedMerchant = req.user.role === 'merchant' && 
      booking.merchant && booking.merchant._id.toString() === req.user._id.toString();
    
    if (!isAssignedMerchant && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to approve/reject this booking' });
    }

    // Validate status
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be APPROVED or REJECTED' });
    }

    // Update approval status
    booking.batteryTire.merchantApproval.status = status;
    booking.batteryTire.merchantApproval.notes = notes;

    if (status === 'APPROVED') {
      if (!price || price <= 0) {
        return res.status(400).json({ message: 'Price is required for approval' });
      }
      booking.batteryTire.merchantApproval.price = price;
      booking.batteryTire.merchantApproval.image = image;
      booking.batteryTire.merchantApproval.approvedAt = new Date();
      
      // Update total amount with merchant's price
      booking.totalAmount = price;
    } else {
      booking.batteryTire.merchantApproval.rejectedAt = new Date();
    }

    const updatedBooking = await booking.save();

    // Populate for response
    const populated = await Booking.findById(updatedBooking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('pickupDriver', 'name email phone');

    // Emit socket event for real-time updates
    emitBookingUpdate(populated);

    // Send notifications
    try {
      const orderId = populated.orderNumber || populated._id.toString().slice(-6).toUpperCase();
      
      // Notify admin
      await sendPushToRole(
        'admin',
        `Battery/Tire Service ${status}`,
        `Merchant has ${status.toLowerCase()} battery/tire service #${orderId}${status === 'APPROVED' ? ` for ₹${price}` : ''}`,
        { type: 'battery_tire_approval', bookingId: populated._id.toString(), status },
        'order'
      );

      // Notify customer
      if (populated.user?._id) {
        const message = status === 'APPROVED' 
          ? `Your battery/tire service #${orderId} has been approved by the merchant for ₹${price}. Staff will collect the items and deliver to you.`
          : `Your battery/tire service #${orderId} has been rejected by the merchant. ${notes ? `Reason: ${notes}` : ''}`;
        
        await sendPushToUser(
          populated.user._id,
          `Service ${status}`,
          message,
          { type: 'battery_tire_approval', bookingId: populated._id.toString(), status },
          'order'
        );
      }

      // If approved, notify assigned staff
      if (status === 'APPROVED' && populated.pickupDriver?._id) {
        await sendPushToUser(
          populated.pickupDriver._id,
          'Battery/Tire Service Approved',
          `Battery/tire service #${orderId} has been approved. Please go to merchant location to collect items.`,
          { type: 'battery_tire_approved', bookingId: populated._id.toString() },
          'order'
        );
      }

    } catch (notifyErr) {
      
    }

    res.json(populated);
  } catch (error) {
    
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add warranty information for battery/tire service
// @route   PUT /api/bookings/:id/warranty
// @access  Private (Merchant only)
export const addWarranty = async (req, res) => {
  const { name, price, warrantyMonths, image } = req.body;

  try {
    const booking = await Booking.findById(req.params.id).populate('merchant');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if this is a battery/tire service
    if (!booking.batteryTire?.isBatteryTireService) {
      return res.status(400).json({ message: 'This is not a battery/tire service' });
    }

    // Check if user is the assigned merchant
    const isAssignedMerchant = req.user.role === 'merchant' && 
      booking.merchant && booking.merchant._id.toString() === req.user._id.toString();
    
    if (!isAssignedMerchant && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to add warranty for this booking' });
    }

    // Validate required fields
    if (!name || !price || !warrantyMonths) {
      return res.status(400).json({ message: 'Name, price, and warranty months are required' });
    }

    if (price <= 0 || warrantyMonths <= 0) {
      return res.status(400).json({ message: 'Price and warranty months must be positive numbers' });
    }

    // Add warranty information
    booking.batteryTire.warranty = {
      name,
      price: parseFloat(price),
      warrantyMonths: parseInt(warrantyMonths),
      image,
      addedAt: new Date(),
      addedBy: req.user._id
    };

    const updatedBooking = await booking.save();

    // Populate for response
    const populated = await Booking.findById(updatedBooking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('pickupDriver', 'name email phone')
      .populate('batteryTire.warranty.addedBy', 'name email');

    // Emit socket event for real-time updates
    emitBookingUpdate(populated);

    // Send notifications
    try {
      const orderId = populated.orderNumber || populated._id.toString().slice(-6).toUpperCase();
      
      // Notify admin
      await sendPushToRole(
        'admin',
        'Warranty Added',
        `Warranty information added for battery/tire service #${orderId} - ${name} (${warrantyMonths} months)`,
        { type: 'warranty_added', bookingId: populated._id.toString() },
        'order'
      );

      // Notify customer
      if (populated.user?._id) {
        await sendPushToUser(
          populated.user._id,
          'Warranty Information Added',
          `Warranty details have been added to your battery/tire service #${orderId}: ${name} with ${warrantyMonths} months warranty.`,
          { type: 'warranty_added', bookingId: populated._id.toString() },
          'order'
        );
      }

    } catch (notifyErr) {
      
    }

    res.json(populated);
  } catch (error) {
    
    res.status(500).json({ message: error.message });
  }
};
