import Booking from '../models/Booking.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';
import { sendEmail } from '../utils/emailService.js';
import { normalizeStatus, isValidTransition } from '../utils/statusMachine.js';
import { sendPushToUser, sendPushToRole } from '../utils/pushService.js';
import crypto from 'crypto';

export const emitBookingUpdate = (booking) => {
  try {
    const io = getIO();
    const bookingId = booking._id.toString();
    
    // Notify admin
    io.to('admin').emit('bookingUpdated', booking);
    console.log(`Emitted bookingUpdated for booking ${bookingId} to 'admin' room`);
    
    // Also notify admin specifically about new bookings
    if (booking.status === 'CREATED') {
      io.to('admin').emit('bookingCreated', booking);
      console.log(`Emitted bookingCreated for booking ${bookingId} to 'admin' room`);
      
      // Save notification to history and send push to admins
      sendPushToRole(
        'admin',
        'New Booking Received',
        `A new booking (#${booking.orderNumber || bookingId.slice(-6).toUpperCase()}) has been created.`,
        { bookingId, type: 'order' },
        'order'
      ).catch(err => console.error('Admin notification error (emitBookingUpdate):', err));
    } else if (booking.status === 'CANCELLED') {
      io.to('admin').emit('bookingCancelled', booking);
      
      sendPushToRole(
        'admin',
        'Booking Cancelled',
        `Booking #${booking.orderNumber || bookingId.slice(-6).toUpperCase()} has been cancelled.`,
        { bookingId, type: 'order' },
        'order'
      ).catch(err => console.error('Admin notification error (emitBookingUpdate - Cancelled):', err));
    }
    
    // Notify specific booking room
    io.to(`booking_${bookingId}`).emit('bookingUpdated', booking);
    
    // Notify relevant users
    const usersToNotify = [
      booking.user?._id || booking.user,
      booking.merchant?._id || booking.merchant,
      booking.pickupDriver?._id || booking.pickupDriver,
      booking.technician?._id || booking.technician,
    ].filter(id => id); // Remove null/undefined

    usersToNotify.forEach(userId => {
      const room = `user_${userId.toString()}`;
      io.to(room).emit('bookingUpdated', booking);
      io.to(room).emit('bookingCreated', booking); // Also emit bookingCreated for compatibility
    });
  } catch (err) {
    console.error('Socket emit error (emitBookingUpdate):', err);
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

    // Check if this is a car wash service
    const isCarWashService = services.some(service => 
      service.category === 'Car Wash' || service.category === 'Wash'
    );

    // For car wash services, create booking with pending payment status
    if (isCarWashService) {
      const MAX_RETRIES = 5;
      let lastError = null;
      let createdBooking = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const orderNumber = await Counter.next('booking');
          const booking = new Booking({
            user: req.user._id,
            vehicle: vehicleId,
            services: serviceIds,
            date,
            orderNumber,
            notes,
            location,
            totalAmount,
            paymentStatus: 'pending', // Payment required before confirmation
            status: 'CREATED', // Stays in CREATED until admin assigns staff
            carWash: {
              isCarWashService: true,
              beforeWashPhotos: [],
              afterWashPhotos: [],
            }
          });

          createdBooking = await booking.save();
          break;
        } catch (err) {
          lastError = err;
          // Retry on duplicate orderNumber, otherwise abort
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
            console.error('Failed to align booking counter', alignError);
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
          'Car Wash Booking Created - Payment Required',
          `Dear User,\n\nYour car wash booking for ${serviceNames} has been created.\nDate: ${new Date(date).toLocaleDateString()}\nTotal Amount: ₹${totalAmount}\n\nPlease complete the payment to confirm your booking.\n\nThank you for choosing DriveFlow!`
        ).catch(emailError => console.error('Email sending failed:', emailError));
      }

      res.status(201).json({
        ...createdBooking.toObject(),
        requiresPayment: true,
        message: 'Car wash booking created. Please complete payment to confirm.'
      });

      // Send push to customer
      try {
        await sendPushToUser(
          req.user._id,
          'Car Wash Booking Created',
          `Your car wash booking (#${createdBooking.orderNumber}) has been created. Please complete payment to confirm.`,
          { bookingId: createdBooking._id.toString(), type: 'car_wash_payment_required' },
          'order'
        );
      } catch (err) {
        console.error('Customer notification error (createBooking):', err);
      }

      // Emit socket event for real-time updates
      try {
        const populated = await Booking.findById(createdBooking._id)
          .populate('user', 'id name email phone')
          .populate('vehicle')
          .populate('services');
          
        emitBookingUpdate(populated || createdBooking);
      } catch (err) {
        console.error('Socket emit error (createBooking):', err);
      }

      return; // Exit early for car wash services
    }

    // Regular service booking flow (existing logic)
    const MAX_RETRIES = 5;
    let lastError = null;
    let createdBooking = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const orderNumber = await Counter.next('booking');
        const booking = new Booking({
          user: req.user._id,
          vehicle: vehicleId,
          services: serviceIds,
          date,
          orderNumber,
          notes,
          location,
          totalAmount,
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
          console.error('Push notification error (createBooking):', err);
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
          console.error('Failed to align booking counter', alignError);
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
      ).catch(emailError => console.error('Email sending failed:', emailError));
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
      console.error('Customer notification error (createBooking):', err);
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
      console.error('Socket emit error (createBooking):', err);
    }
  } catch (error) {
    console.error('Create Booking Error:', error);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
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
    console.error('getMyBookings Error:', error);
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
    console.error('Update Booking Status Error:', error);
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

  try {
    const booking = await Booking.findById(req.params.id);

    if (booking) {
      // Handle car wash service assignment
      if (booking.carWash?.isCarWashService) {
        if (carWashStaffId) {
          booking.carWash.staffAssigned = carWashStaffId;
          booking.status = 'ASSIGNED';
        }
        if (slot) booking.date = slot;
      } else {
        // Handle regular service assignment
        if (merchantId) booking.merchant = merchantId;
        if (driverId) booking.pickupDriver = driverId;
        if (technicianId) booking.technician = technicianId;
        if (slot) booking.date = slot;

        // Automatic status update rules for regular services
        if (booking.status === 'CREATED') {
          const canAssign = booking.merchant && booking.pickupDriver;
          if (canAssign) {
            booking.status = 'ASSIGNED';
          }
        }
      }

      const updatedBooking = await booking.save();
      
      // Populate essential fields for real-time consumers
      const populated = await Booking.findById(updatedBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('merchant', 'name email phone location')
        .populate('pickupDriver', 'name email phone')
        .populate('technician', 'name email phone')
        .populate('carWash.staffAssigned', 'name email phone');

      // Emit real-time update for all stakeholders
      emitBookingUpdate(populated);

      // Send assignment notifications
      try {
        const bookingIdStr = String(populated._id);
        const orderId = populated.orderNumber || bookingIdStr.slice(-6).toUpperCase();

        // Car wash assignment notifications
        if (booking.carWash?.isCarWashService && populated.carWash?.staffAssigned?._id && carWashStaffId) {
          await sendPushToUser(
            populated.carWash.staffAssigned._id,
            'Car Wash Assignment',
            `You have been assigned to car wash service #${orderId}`,
            { type: 'assignment', role: 'car_wash_staff', bookingId: bookingIdStr },
            'order'
          );

          // Notify customer about car wash staff assignment
          if (populated.user?._id) {
            await sendPushToUser(
              populated.user._id,
              'Car Wash Staff Assigned',
              `Staff has been assigned to your car wash service #${orderId}. They will reach your location shortly.`,
              { type: 'car_wash_assignment_update', bookingId: bookingIdStr },
              'order'
            );
          }
        } else {
          // Regular service assignment notifications
          if (populated.merchant?._id && merchantId) {
            await sendPushToUser(
              populated.merchant._id,
              'New Assignment',
              `You have been assigned to booking #${orderId}`,
              { type: 'assignment', role: 'merchant', bookingId: bookingIdStr },
              'order'
            );
          }

          if (populated.pickupDriver?._id && driverId) {
            await sendPushToUser(
              populated.pickupDriver._id,
              'New Assignment',
              `You have been assigned to booking #${orderId}`,
              { type: 'assignment', role: 'staff', bookingId: bookingIdStr },
              'order'
            );
          }

          if (populated.technician?._id && technicianId) {
            await sendPushToUser(
              populated.technician._id,
              'New Assignment',
              `You have been assigned to booking #${orderId}`,
              { type: 'assignment', role: 'staff', bookingId: bookingIdStr },
              'order'
            );
          }

          // Notify Customer about regular service assignments
          if (populated.user?._id) {
            let assignmentMsg = `Your booking #${orderId} has been updated.`;
            
            if (merchantId && (driverId || technicianId)) {
              assignmentMsg = `Your service #${orderId} has been assigned to a merchant and staff.`;
            } else if (merchantId) {
              assignmentMsg = `Merchant ${populated.merchant?.name || ''} has been assigned to your booking #${orderId}.`;
            } else if (driverId || technicianId) {
              assignmentMsg = `Staff has been assigned to your booking #${orderId}.`;
            }
            
            await sendPushToUser(
              populated.user._id,
              'Service Assigned',
              assignmentMsg,
              { type: 'assignment_update', bookingId: bookingIdStr },
              'order'
            );
          }
        }
      } catch (notifyErr) {
        console.error('Push notification error (assignBooking):', notifyErr);
      }

      res.json(populated);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
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
        if (beforePhotos.length < 4) {
          return res.status(400).json({ message: 'Please upload 4 before wash photos before starting car wash' });
        }
      }

      if (canonTo === 'CAR_WASH_COMPLETED') {
        console.log('Processing CAR_WASH_COMPLETED status update - no OTP generation');
        const afterPhotos = Array.isArray(booking.carWash?.afterWashPhotos) ? booking.carWash.afterWashPhotos : [];
        console.log('After photos count:', afterPhotos.length);
        if (afterPhotos.length < 4) {
          return res.status(400).json({ message: 'Please upload 4 after wash photos before completing car wash' });
        }
        
        // Set wash completion time (but don't generate OTP yet)
        if (booking.carWash) {
          booking.carWash.washCompletedAt = new Date();
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
      if ((canonTo === 'SERVICE_COMPLETED') && 
          !['SERVICE_COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(booking.status)) {
          
          const Product = (await import('../models/Product.js')).default;
          const Notification = (await import('../models/Notification.js')).default;
          
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
          console.error('Socket emit error (bookingCancelled):', err);
        }
      }

      // Send status update email
      if (updatedBooking.user && updatedBooking.user.email) {
        await sendEmail(
          updatedBooking.user.email,
          'Booking Status Update - DriveFlow',
          `Dear ${updatedBooking.user.name},\n\nYour booking status has been updated to: ${canonTo}.\n\nCheck your dashboard for more details.`
        );
      }
      await sendPushToUser(updatedBooking.user?._id, 'Booking Update', `Your booking status is now: ${canonTo}`, { type: 'status', status: canonTo, bookingId: String(updatedBooking._id) });

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
      console.log('OTP already exists and is valid, not generating new one:', existingOtp.code);
      return res.json({ message: 'OTP already exists', code: existingOtp.code });
    }

    // Generate new OTP only if none exists or expired
    const code = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 4);
    console.log('Generating new OTP:', code);
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
    
    // Update status to DELIVERED when OTP is verified
    booking.status = 'DELIVERED';
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
    
    console.log('OTP verified and status updated to DELIVERED for booking:', booking._id);
    res.json({ message: 'OTP verified and delivery completed', booking: populated });
  } catch (e) {
    console.error('verifyDeliveryOtp error:', e);
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
        booking.inspection = { ...booking.inspection?._doc, ...inspection };
        booking.markModified('inspection');
      }
      if (delay) {
        booking.delay = { ...booking.delay?._doc, ...delay };
        booking.markModified('delay');
      }
      if (serviceExecution) {
        booking.serviceExecution = { ...booking.serviceExecution?._doc, ...serviceExecution };
        booking.markModified('serviceExecution');
      }
      if (qc) {
        booking.qc = { ...booking.qc?._doc, ...qc };
        booking.markModified('qc');
      }
      if (billing) {
        booking.billing = { ...booking.billing?._doc, ...billing };
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
        booking.revisit = { ...booking.revisit?._doc, ...revisit };
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
            booking.billing.total = (booking.billing.labourCost || 0) + partsTotal + (booking.billing.gst || 0);
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
      console.error('Customer notification error:', err);
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

export const testGenerateOtp = async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log('testGenerateOtp called for booking:', bookingId);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Generate delivery OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Test generated OTP:', otpCode);
    
    booking.deliveryOtp = {
      code: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0
    };
    
    await booking.save();
    console.log('Test saved booking with OTP:', booking.deliveryOtp);

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');

    emitBookingUpdate(populated);

    res.json({ 
      message: 'Test OTP generated successfully', 
      booking: populated,
      deliveryOtp: otpCode 
    });
  } catch (error) {
    console.error('testGenerateOtp error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const completeCarWash = async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log('completeCarWash called for booking:', bookingId);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.log('Booking not found:', bookingId);
      return res.status(404).json({ message: 'Booking not found' });
    }

    console.log('Found booking:', booking._id, 'status:', booking.status);

    if (!booking.carWash?.isCarWashService) {
      console.log('Not a car wash service');
      return res.status(400).json({ message: 'This is not a car wash service' });
    }

    // Check if user is assigned staff
    if (booking.carWash.staffAssigned?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      console.log('Not authorized - staff assigned:', booking.carWash.staffAssigned, 'user:', req.user._id);
      return res.status(403).json({ message: 'Not authorized to complete car wash for this booking' });
    }

    if (booking.status !== 'CAR_WASH_STARTED') {
      console.log('Invalid status for completion:', booking.status);
      return res.status(400).json({ message: 'Car wash must be started before completion' });
    }

    // Check if after photos are uploaded
    const afterPhotos = Array.isArray(booking.carWash?.afterWashPhotos) ? booking.carWash.afterWashPhotos : [];
    if (afterPhotos.length < 4) {
      console.log('Not enough after photos:', afterPhotos.length);
      return res.status(400).json({ message: 'Please upload 4 after wash photos before completing car wash' });
    }

    booking.status = 'CAR_WASH_COMPLETED';
    booking.carWash.washCompletedAt = new Date();
    await booking.save();

    // Generate delivery OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otpCode);
    booking.deliveryOtp = {
      code: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0
    };
    await booking.save();
    console.log('Saved booking with OTP');

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');

    console.log('Populated booking OTP:', populated.deliveryOtp);

    emitBookingUpdate(populated);

    // Notify customer with OTP
    try {
      console.log('Sending car wash completion notification to user:', booking.user, 'with OTP:', otpCode);
      const pushResult = await sendPushToUser(
        booking.user,
        'Car Wash Completed',
        `Your car wash service (#${booking.orderNumber}) is completed! Your delivery OTP is: ${otpCode}`,
        { bookingId: booking._id.toString(), type: 'car_wash_completed', otp: otpCode },
        'order'
      );
      console.log('Push notification result:', pushResult);
    } catch (err) {
      console.error('Customer notification error:', err);
    }

    res.json({ 
      message: 'Car wash completed successfully', 
      booking: populated,
      deliveryOtp: otpCode 
    });
  } catch (error) {
    console.error('completeCarWash error:', error);
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