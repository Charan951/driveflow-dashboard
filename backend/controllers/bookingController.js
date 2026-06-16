import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import SlotBlock from '../models/SlotBlock.js';
import AvailableServicePincode from '../models/AvailableServicePincode.js';
import { generateOrderNumber, formatOrderReference } from '../utils/orderNumber.js';
import User from '../models/User.js';
import { getIO, emitChatMessage } from '../socket.js';
import { emitEntitySync } from '../utils/syncService.js';
import { sendEmail } from '../utils/emailService.js';
import { normalizeStatus, isValidTransition } from '../utils/statusMachine.js';
import { sendPushToUser, sendPushToRole } from '../utils/pushService.js';
import {
  sendLiveTrackingDismissPush,
  trySendLiveTrackingAssignmentSeed,
} from '../utils/liveTrackingPush.js';
import { normalizeIndianMobile, sendWhatsAppMessage, resolveAssignedWhatsAppTemplateName, resolveFeedbackWhatsAppTemplateName } from '../utils/msg91Service.js';
import crypto from 'crypto';
import Message from '../models/Message.js';
import { attachHealthPercentToBookingPayload } from '../utils/vehicleHealthDisplay.js';

const SLOT_INTERVAL_MINUTES = 30;
const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 19;
const CAR_WASH_MIN_PHOTOS = 2;
const CAR_WASH_MAX_PHOTOS = 4;
const BATTERY_AFTER_PHOTOS_REQUIRED = 4;

/** Customer mobile push when vehicle is out for delivery with PIN. */
const sendCustomerDeliveryOtpPush = async (booking, code) => {
  const userRef = booking?.user;
  const userId =
    userRef && typeof userRef === 'object' && userRef._id
      ? userRef._id
      : userRef;
  if (!userId || !code) return;

  const orderRef = formatOrderReference(booking);

  await sendPushToUser(
    userId,
    'Delivery OTP',
    `Your vehicle is on the way for booking #${orderRef}. Share delivery PIN ${code} with your delivery partner when they arrive. PIN expires in 20 minutes.`,
    {
      type: 'delivery_otp',
      status: 'OUT_FOR_DELIVERY',
      bookingId: String(booking._id),
      deliveryOtp: String(code),
    },
    'delivery_otp'
  );
};
const BLOCKING_STATUSES = {
  $nin: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
};

const normalizePincode = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
};

const extractPincodeFromAddress = (address) => {
  const match = String(address || '').match(/(\d{6})(?!\d)/);
  return normalizePincode(match ? match[1] : null);
};

const getCategoryGroup = (serviceCategory) => {
  const cat = (serviceCategory || '').trim();
  if (cat === 'Car Wash' || cat === 'Wash') {
    return 'Car Wash';
  } else if (cat === 'Tyres' || cat === 'Battery' || cat === 'Tyre & Battery') {
    return 'Tyres & Battery';
  } else if (cat === 'Essentials') {
    return 'Essentials';
  } else {
    return 'General Services';
  }
};

/** Helper to calculate services total with vehicle-specific pricing (like car wash). */
export const calculateServicesTotal = async (serviceIds, vehicleId, selectedBrands = {}) => {
  try {
    const Service = (await import('../models/Service.js')).default;
    const Vehicle = (await import('../models/Vehicle.js')).default;
    const { getVehicleDataFromS3 } = await import('../utils/s3Storage.js');

    const services = await Service.find({ _id: { $in: serviceIds } });
    const vehicle = await Vehicle.findById(vehicleId);
    const allRefData = await getVehicleDataFromS3();

    let refMatch = null;
    if (vehicle) {
      const cleanBrand = vehicle.make.trim().toLowerCase();
      const cleanModel = vehicle.model.trim().toLowerCase();
      const cleanVariant = vehicle.variant ? vehicle.variant.trim().toLowerCase() : '';

      refMatch = allRefData.find(item => 
        item.brand_name.toLowerCase() === cleanBrand && 
        item.model.toLowerCase() === cleanModel && 
        (cleanVariant === '' || item.brand_model.toLowerCase() === cleanVariant)
      );
    }

    let total = 0;
    services.forEach(service => {
      const isWash = service.category === 'Car Wash' || service.category === 'Wash';
      const isTire = service.category === 'Tyres' || service.category === 'Tyre & Battery';
      const isGeneral =
        service.category === 'Periodic' ||
        service.category === 'Services' ||
        (service.name && service.name.toLowerCase().includes('general service'));

      if (isGeneral && refMatch) {
        const generalPrice = Number(refMatch.general_service_price);
        if (refMatch.general_service_price && !isNaN(generalPrice) && generalPrice > 0) {
          total += generalPrice;
        } else {
          total += service.price;
        }
      } else if (isWash && refMatch) {
        let washPrice = null;
        const sName = service.name.toLowerCase();

        if (sName.includes('exterior wash') && !sName.includes('interior')) {
          washPrice = refMatch.car_wash_exterior_price;
        } else if (sName.includes('interior + exterior') && !sName.includes('underbody')) {
          washPrice = refMatch.car_wash_interior_exterior_price;
        } else if (sName.includes('underbody wash') || (sName.includes('interior') && sName.includes('exterior') && sName.includes('underbody'))) {
          washPrice = refMatch.car_wash_interior_exterior_underbody_price;
        }

        // Fallback to legacy car_wash_price if specific one is not set
        if (!washPrice || washPrice === '') {
          washPrice = refMatch.car_wash_price;
        }

        const priceNum = Number(washPrice);
        if (washPrice && !isNaN(priceNum) && priceNum > 0) {
          total += priceNum;
        } else {
          total += service.price;
        }
      } else if (isTire && refMatch) {
        const selectedBrand = selectedBrands[service._id];
        if (selectedBrand) {
          const brandKey = `tyre_price_${selectedBrand.toLowerCase().replace(/\s+/g, '')}`;
          const brandPrice = refMatch[brandKey];
          const priceNum = Number(brandPrice);
          if (brandPrice && !isNaN(priceNum) && priceNum > 0) {
            total += priceNum;
          } else {
            total += service.price;
          }
        } else {
          total += service.price;
        }
      } else {
        total += service.price;
      }
    });

    return { total, refMatch, services };
  } catch (err) {
    console.error('Error in calculateServicesTotal:', err);
    // Fallback to basic calculation
    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: serviceIds } });
    const total = services.reduce((acc, s) => acc + s.price, 0);
    return { total, refMatch: null, services };
  }
};

const formatTo12HourSlot = (date) => {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const getDayBounds = (dateInput) => {
  let date;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    // Force local midnight for YYYY-MM-DD strings to avoid UTC shifts
    const [y, m, d] = dateInput.split('T')[0].split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) {
    return { 
      start: new Date(1970, 0, 1), 
      end: new Date(1970, 0, 1) 
    };
  }

  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);
  return { start, end };
};

const getAllSlotsForDate = (dateInput) => {
  const { start } = getDayBounds(dateInput);
  const slots = [];
  const base = new Date(start);
  base.setHours(SLOT_START_HOUR, 0, 0, 0);
  const endLimit = new Date(start);
  endLimit.setHours(SLOT_END_HOUR, 0, 0, 0);

  for (let current = new Date(base); current < endLimit; current.setMinutes(current.getMinutes() + SLOT_INTERVAL_MINUTES)) {
    slots.push(formatTo12HourSlot(new Date(current)));
  }
  return slots;
};

const getBlockedSlotsForDate = async (dateInput, category = 'All') => {
  const { start, end } = getDayBounds(dateInput);
  
  const query = {
    date: { $gte: start, $lte: end },
    $or: [
      { category: 'All' },
      { category: category }
    ]
  };

  const blocks = await SlotBlock.find(query).select('slot');
  return new Set(blocks.map((b) => b.slot.trim()));
};

const isSlotAvailable = async (date, categories = ['All']) => {
  const slotStart = new Date(date);
  const slotLabel = formatTo12HourSlot(slotStart).trim();
  const categoriesToCheck = Array.isArray(categories) ? categories : [categories];
  const { start, end } = getDayBounds(date);

  // Check for admin blocks (same rules as getAvailableSlots)
  for (const category of categoriesToCheck) {
    const blockedSlots = await getBlockedSlotsForDate(start, category);
    if (blockedSlots.has(slotLabel)) {
      return false;
    }
  }

  // Check for conflicting bookings using slot labels (aligned with getAvailableSlots)
  const bookings = await Booking.find({
    status: BLOCKING_STATUSES,
    date: { $gte: start, $lte: end },
  }).populate('services', 'category');

  for (const booking of bookings) {
    const bookingSlot = formatTo12HourSlot(new Date(booking.date)).trim();
    if (bookingSlot !== slotLabel) continue;

    const bookingCategories = new Set();
    booking.services.forEach((s) => {
      bookingCategories.add(getCategoryGroup(s.category));
    });

    const hasIntersection = categoriesToCheck.some((cat) => bookingCategories.has(cat));
    if (hasIntersection) {
      return false;
    }
  }

  return true;
};

export const emitBookingUpdate = (booking) => {
  try {
    const io = getIO();
    const bookingId = booking._id.toString();
    const payload = attachHealthPercentToBookingPayload(booking);

    // Notify admin
    io.to('admin').emit('bookingUpdated', payload);

    // Also notify admin specifically about new bookings
    if (booking.status === 'CREATED') {
      io.to('admin').emit('bookingCreated', payload);

      // Save notification to history and send push to admins
      sendPushToRole(
        'admin',
        'New Booking Received',
        `A new booking (#${booking.orderNumber || bookingId.slice(-6).toUpperCase()}) has been created.`,
        { bookingId, type: 'order' },
        'order'
      );
    } else if (booking.status === 'CANCELLED') {
      io.to('admin').emit('bookingCancelled', payload);

      sendPushToRole(
        'admin',
        'Booking Cancelled',
        `Booking #${booking.orderNumber || bookingId.slice(-6).toUpperCase()} has been cancelled.`,
        { bookingId, type: 'order' },
        'order'
      );
    }

    // Notify specific booking room
    io.to(`booking_${bookingId}`).emit('bookingUpdated', payload);

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
      io.to(room).emit('bookingUpdated', payload);
      // Only emit bookingCreated for a true new booking — not on every status sync
      // (was causing duplicate "New Booking" client notifications per update).
      if (booking.status === 'CREATED') {
        io.to(room).emit('bookingCreated', payload);
      }
    });

    // Global Real-time Sync
    emitEntitySync('booking', booking.status === 'CREATED' ? 'created' : 'updated', payload);
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

// Helper function to check if booking is for battery service only
const isBatteryBooking = async (booking) => {
  try {
    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: booking.services } });
    return services.some(service => 
      service.category === 'Battery'
    );
  } catch (error) {
    return false;
  }
};

// Helper function to check if booking is for general service
const isGeneralServiceBooking = async (booking) => {
  try {
    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: booking.services } });
    return services.some(service => 
      service.category === 'Periodic' ||
      service.category === 'Services' ||
      service.name.toLowerCase().includes('general service')
    );
  } catch (error) {
    return false;
  }
};

// Helper function to check if booking is for Essentials service
const isEssentialsBooking = async (booking) => {
  try {
    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: booking.services } });
    return services.some(service => 
      service.category && service.category.toLowerCase().includes('essentials')
    );
  } catch (error) {
    return false;
  }
};

/** Greeting + automated status chat lines — run off the critical path so PUT /status returns quickly. */
const queueChatAutomationForBookingStatus = (savedBooking, canonTo) => {
  const chatEnabledStatuses = ['SERVICE_STARTED', 'CAR_WASH_STARTED', 'INSTALLATION', 'On Hold'];
  if (!chatEnabledStatuses.includes(canonTo)) {
    return Promise.resolve();
  }
  return (async () => {
    try {
      let systemUser = await User.findOne({ role: 'admin' });
      if (!systemUser) {
        systemUser = await User.findOne({ role: { $regex: /^admin$/i } });
      }

      if (!systemUser) return;

      const existingGreeting = await Message.findOne({
        bookingId: savedBooking._id,
        text: /Welcome to Carzzi Support Chat/
      });

      if (!existingGreeting) {
        const greetingText = `Hi 👋 Hope you’re doing well! 
Welcome to Carzzi Support Chat  🚗 
Through this chat, you can easily communicate with your assigned merchant regarding your requests. You will also receive updates here about the approval or rejection of parts submitted. 
If you have any questions, need assistance, or want to follow up on a request, feel free to message here anytime — we’re here to help you! 
Thank you for choosing Carzzi 🙌`;

        const greetingMessage = new Message({
          bookingId: savedBooking._id,
          sender: systemUser._id,
          text: greetingText,
          recipientRole: 'customer'
        });
        await greetingMessage.save();

        const populatedGreeting = await greetingMessage.populate('sender', '_id name role');
        emitChatMessage(savedBooking._id, populatedGreeting);
      }

      const existingStatusMessage = await Message.findOne({
        bookingId: savedBooking._id,
        text: new RegExp(`^${canonTo.replace(/_/g, ' ')}`, 'i')
      });

      if (!existingStatusMessage) {
        let statusText = '';
        if (canonTo === 'SERVICE_STARTED') statusText = "Service has started for your vehicle. Our technician is working on it.";
        else if (canonTo === 'CAR_WASH_STARTED') {
          const isEssentials = await isEssentialsBooking(savedBooking);
          statusText = isEssentials
            ? "Service has started for your vehicle. Our staff is working on it."
            : "Car wash has started for your vehicle. Our staff is working on it.";
        }
        else if (canonTo === 'INSTALLATION') statusText = "Installation has started for your vehicle.";
        else if (canonTo === 'On Hold') statusText = "Your service is currently on hold. We will update you soon.";

        if (statusText) {
          const statusMessage = new Message({
            bookingId: savedBooking._id,
            sender: systemUser._id,
            text: statusText,
            recipientRole: 'customer'
          });
          await statusMessage.save();

          const populatedStatus = await statusMessage.populate('sender', '_id name role');
          emitChatMessage(savedBooking._id, populatedStatus);
        }
      }
    } catch (msgErr) {
      console.error('Error sending automated service started message:', msgErr);
    }
  })();
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  const { vehicleId, serviceIds, date, notes, location, selectedBrands } = req.body;

  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }

    // Pickup address is now always required
    const hasAddress = location && typeof location.address === 'string' && location.address.trim().length > 0;
    if (!hasAddress) {
      return res.status(400).json({ message: 'Pickup address is required' });
    }

    const bookingPincode = extractPincodeFromAddress(location.address);
    if (!bookingPincode) {
      return res.status(400).json({ message: 'Pickup address must contain a valid 6-digit pincode' });
    }

    const availablePincodes = await AvailableServicePincode.find({}).select('pincode').lean();
    const allowedSet = new Set(availablePincodes.map((p) => p.pincode));
    if (allowedSet.size === 0) {
      return res.status(503).json({
        message:
          'Service booking is not available yet. An administrator must add at least one allowed service pincode.',
      });
    }
    if (!allowedSet.has(bookingPincode)) {
      return res.status(409).json({ message: 'Service is not available for the selected pincode' });
    }

    const Service = (await import('../models/Service.js')).default;
    const Vehicle = (await import('../models/Vehicle.js')).default;
    const { total: servicesTotal, refMatch, services } = await calculateServicesTotal(serviceIds, vehicleId, selectedBrands);

    // Determine booking categories for slot availability check
    const bookingCategories = new Set();
    services.forEach((s) => {
      bookingCategories.add(getCategoryGroup(s.category));
    });

    const slotAvailable = await isSlotAvailable(parsedDate, Array.from(bookingCategories));
    if (!slotAvailable) {
      return res.status(409).json({ message: 'Selected slot is not available for one or more selected services' });
    }

    let totalAmount = servicesTotal;
    let pickupDropPrice = 0;

    // Check if this is a general service booking
    const isGeneralService = services.some(service => 
      service.category === 'Periodic' || 
      service.category === 'Services' || 
      (service.name && service.name.toLowerCase().includes('general service'))
    );

    // If general service, add pickup_drop_price from reference data
    if (isGeneralService) {
      try {
        if (refMatch && refMatch.pickup_drop_price) {
          const extra = Number(refMatch.pickup_drop_price);
          if (!isNaN(extra)) {
            pickupDropPrice = extra;
            totalAmount += extra;
          }
        }
      } catch (err) {
        console.error('Error adding pickup_drop_price to booking:', err);
      }
    }

    // Check if this is a service that requires payment (Car Wash, Battery/Tires, or Essentials)
    const requiresPaymentService = services.some(service => 
      service.category === 'Car Wash' || 
      service.category === 'Wash' ||
      service.category === 'Battery' ||
      service.category === 'Tyres' ||
      service.category === 'Tyre & Battery' ||
      service.category === 'Essentials'
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
        pickupDropPrice,
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
        const orderNumber = await generateOrderNumber();
        
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
          pickupDropPrice,
          finalAmount: totalAmount,
          discountAmount: 0,
          coupon: null,
          // Mark as battery/tire service if applicable
          ...(isBatteryTireService && {
            batteryTire: {
              isBatteryTireService: true
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
        'Booking Confirmation - Carzzi',
        `Dear User,\n\nYour booking for ${serviceNames} has been successfully created.\nDate: ${new Date(date).toLocaleDateString()}\nTotal Amount: ₹${totalAmount}\n\nThank you for choosing Carzzi!`
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

// @desc    Get available slots for a date
// @route   GET /api/bookings/available-slots?date=YYYY-MM-DD
// @access  Private
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, category = 'All' } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'date query param is required' });
    }

    const parsedDate = new Date(String(date));
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const { start, end } = getDayBounds(date);

    const bookings = await Booking.find({
      status: BLOCKING_STATUSES,
      date: { $gte: start, $lte: end },
    }).populate('services', 'category');

    const bookedSlots = new Set();
    bookings.forEach((booking) => {
      const slotTime = formatTo12HourSlot(new Date(booking.date)).trim();
      if (category === 'All') {
        bookedSlots.add(slotTime);
      } else {
        const hasCategory = booking.services.some(
          (s) => getCategoryGroup(s.category) === category
        );
        if (hasCategory) {
          bookedSlots.add(slotTime);
        }
      }
    });

    const blockedSlots = await getBlockedSlotsForDate(date, category);
    const allSlots = getAllSlotsForDate(date);
    const unavailableSlots = new Set([...bookedSlots, ...blockedSlots]);
    const availableSlots = allSlots.filter((slot) => !unavailableSlots.has(slot));

    res.json({
      date: start.toISOString(),
      category,
      allSlots,
      availableSlots,
      blockedSlots: Array.from(blockedSlots),
      bookedSlots: Array.from(bookedSlots),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get slots state for admin for a date
// @route   GET /api/bookings/admin/slots?date=YYYY-MM-DD
// @access  Private/Admin
export const getAdminSlotsForDate = async (req, res) => {
  try {
    const { date, category = 'All' } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'date query param is required' });
    }

    const parsedDate = new Date(String(date));
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const { start, end } = getDayBounds(date);

    const bookings = await Booking.find({
      status: BLOCKING_STATUSES,
      date: { $gte: start, $lte: end },
    }).populate('services', 'category');

    const slotBlocks = await SlotBlock.find({
      date: { $gte: start, $lte: end },
      $or: [
        { category: 'All' },
        { category: category }
      ]
    }).select('slot');

    const bookedSlots = new Set();
    bookings.forEach((booking) => {
      const slotTime = formatTo12HourSlot(new Date(booking.date)).trim();
      if (category === 'All') {
        bookedSlots.add(slotTime);
      } else {
        const hasCategory = booking.services.some(
          (s) => getCategoryGroup(s.category) === category
        );
        if (hasCategory) {
          bookedSlots.add(slotTime);
        }
      }
    });
    const blockedSlots = new Set(slotBlocks.map((s) => s.slot.trim()));
    const allSlots = getAllSlotsForDate(date);

    res.json({
      date: start.toISOString(),
      category,
      allSlots,
      bookedSlots: Array.from(bookedSlots),
      blockedSlots: Array.from(blockedSlots),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Replace admin-blocked slots for a date
// @route   PUT /api/bookings/admin/slots
// @access  Private/Admin
export const updateAdminSlotBlocks = async (req, res) => {
  try {
    const { date, category = 'All', blockedSlots = [] } = req.body || {};
    if (!date) {
      return res.status(400).json({ message: 'date is required' });
    }
    if (!Array.isArray(blockedSlots)) {
      return res.status(400).json({ message: 'blockedSlots must be an array' });
    }

    const parsedDate = new Date(String(date));
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const allSlots = getAllSlotsForDate(date);
    const invalidSlots = blockedSlots.filter((slot) => !allSlots.includes(slot));
    if (invalidSlots.length > 0) {
      return res.status(400).json({ message: `Invalid slots: ${invalidSlots.join(', ')}` });
    }

    const { start, end } = getDayBounds(date);
    await SlotBlock.deleteMany({ 
      date: { $gte: start, $lte: end },
      category: category
    });

    if (blockedSlots.length > 0) {
      await SlotBlock.insertMany(
        blockedSlots.map((slot) => ({
          date: start,
          slot,
          category,
          blockedBy: req.user._id,
        }))
      );
    }

    emitEntitySync('slotBlock', 'updated', {
      date: start.toISOString(),
      category,
      blockedSlots,
    });

    res.json({
      date: start.toISOString(),
      category,
      blockedSlots,
      message: 'Slots updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available service pincodes
// @route   GET /api/bookings/available-service-pincodes
// @access  Private
export const getAvailableServicePincodes = async (_req, res) => {
  try {
    const blocks = await AvailableServicePincode.find({}).select('pincode').sort({ pincode: 1 }).lean();
    res.json({
      availablePincodes: blocks.map((b) => b.pincode),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Replace available service pincodes list
// @route   PUT /api/bookings/admin/available-service-pincodes
// @access  Private/Admin
export const updateAvailableServicePincodes = async (req, res) => {
  try {
    const { availablePincodes = [] } = req.body || {};
    if (!Array.isArray(availablePincodes)) {
      return res.status(400).json({ message: 'availablePincodes must be an array' });
    }

    const normalizedPincodes = Array.from(
      new Set(availablePincodes.map((p) => normalizePincode(p)).filter(Boolean))
    );

    await AvailableServicePincode.deleteMany({});

    if (normalizedPincodes.length > 0) {
      await AvailableServicePincode.insertMany(
        normalizedPincodes.map((pincode) => ({
          pincode,
          updatedBy: req.user._id,
        }))
      );
    }

    emitEntitySync('availableServicePincode', 'updated', {
      availablePincodes: normalizedPincodes,
    });

    res.json({
      availablePincodes: normalizedPincodes,
      message: 'Available service pincodes updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      .populate('coupon')
      .lean();
    res.json(bookings);
  } catch (error) {
    
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings by user ID
// @route   GET /api/bookings/user/:userId
// @access  Private
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Check authorization: Owner, Admin, Merchant, or Staff
    const isOwner = userId === req.user._id.toString();
    const isElevated = ['admin', 'merchant', 'staff'].includes(req.user.role?.toLowerCase());
    
    if (!isOwner && !isElevated) {
      return res.status(403).json({ message: 'Not authorized to view these bookings' });
    }

    const bookings = await Booking.find({ user: userId })
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

// @desc    Get bookings by vehicle ID
// @route   GET /api/bookings/vehicle/:vehicleId
// @access  Private
export const getVehicleBookings = async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    
    // Check authorization: Admin, Merchant, Staff, or Vehicle Owner
    const isElevated = ['admin', 'merchant', 'staff'].includes(req.user.role?.toLowerCase());
    
    if (!isElevated) {
      // If not elevated, check if they own the vehicle
      const Vehicle = (await import('../models/Vehicle.js')).default;
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle || vehicle.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view bookings for this vehicle' });
      }
    }

    const bookings = await Booking.find({ vehicle: vehicleId })
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

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Public (for tracking page)
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('pickupDriver', 'name email phone')
      .populate('technician', 'name email phone')
      .populate('carWash.staffAssigned', 'name email phone')
      .populate('coupon');
    
    if (booking) {
      // If user is authenticated, check authorization as before
      if (req.user) {
        const isOwner = booking.user && booking.user._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant._id.toString() === req.user._id.toString();
        const isAssignedStaff = req.user.role === 'staff' && (
          (booking.pickupDriver && booking.pickupDriver._id.toString() === req.user._id.toString()) ||
          (booking.technician && booking.technician._id.toString() === req.user._id.toString()) ||
          (booking.carWash?.staffAssigned && booking.carWash.staffAssigned._id.toString() === req.user._id.toString())
        );
        
        if (isOwner || isAdmin || isAssignedMerchant || isAssignedStaff) {
          res.json(attachHealthPercentToBookingPayload(booking));
        } else {
          // If authenticated but not authorized, still allow public access (for tracking)
          res.json(attachHealthPercentToBookingPayload(booking));
        }
      } else {
        // Public access - allow anyone to view the booking via the tracking link
        res.json(attachHealthPercentToBookingPayload(booking));
      }
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    console.error('Error in getBookingById:', error);
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
  const { merchantId, driverId, technicianId, slot, carWashStaffId, assignedAt } = req.body;
  const bookingId = req.params.id;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const updateData = {};
    if (slot) updateData.date = slot;
    if (assignedAt) updateData.assignedAt = assignedAt;

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
        trySendLiveTrackingAssignmentSeed(updatedBooking).catch(() => {});
        
        // Send WhatsApp message to user only when staff is assigned
        const staffAssigned = !!(driverId || technicianId || carWashStaffId);
        if (staffAssigned && updatedBooking.user?.phone) {
          try {
            // console.log('[WhatsApp] Sending assignment message to user:', updatedBooking.user.phone);
            const normalizedPhone = normalizeIndianMobile(updatedBooking.user.phone);
            // console.log('[WhatsApp] Normalized phone:', normalizedPhone);
            if (normalizedPhone) {
              const templateName = resolveAssignedWhatsAppTemplateName();
              // console.log('[WhatsApp] Using template:', templateName);
              
              // Get staff details
              let staffUser = null;
              if (driverId) {
                staffUser = await User.findById(driverId);
              } else if (technicianId) {
                staffUser = await User.findById(technicianId);
              } else if (carWashStaffId) {
                staffUser = await User.findById(carWashStaffId);
              }
              
              // Build template components
              const components = {
                body_1: {
                  type: 'text',
                  value: updatedBooking.user.name || 'User'
                },
                body_2: {
                  type: 'text',
                  value: staffUser?.name || 'Service Partner'
                },
                body_3: {
                  type: 'text',
                  value: staffUser?.phone || 'N/A'
                }
              };
              
              await sendWhatsAppMessage(normalizedPhone, templateName, components);
              // console.log('[WhatsApp] Message sent successfully!');
            }
          } catch (whatsappErr) {
            console.error('[WhatsApp] Failed to send assignment message:', whatsappErr);
          }
        }
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

      // After service is completed, merchant cannot change status
      if (req.user.role === 'merchant' && ['SERVICE_COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(canonFrom)) {
        return res.status(401).json({ message: 'Merchant cannot change status after service completion' });
      }

      if (!isValidTransition(canonFrom, canonTo)) {
        // Allow if admin overrides, otherwise block
        if (req.user.role !== 'admin') {
          return res.status(400).json({ message: `Invalid transition from ${canonFrom} to ${canonTo}` });
        }
      }

      if (canonTo === 'SERVICE_STARTED' || canonTo === 'CAR_WASH_STARTED' || canonTo === 'INSTALLATION' || canonTo === 'SERVICE_COMPLETED' || canonTo === 'CAR_WASH_COMPLETED' || canonTo === 'DELIVERY') {
        if (!booking.deliveryOtp || !booking.deliveryOtp.code) {
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          booking.deliveryOtp = {
            code,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            attempts: 0,
            verifiedAt: null
          };

          // OTP is persisted on booking; notify out-of-band so this request is not blocked on SMTP / push latency
          if (booking.user?.email) {
            const subject = 'Delivery OTP';
            const body = `Your Delivery OTP is ${code}. Use this to confirm service completion/delivery. It expires in 24 hours.`;
            void sendEmail(booking.user.email, subject, body).catch(() => {});
          }
          void sendPushToUser(booking.user?._id, 'Delivery OTP', `Your Delivery OTP is ${code}`, { type: 'otp', bookingId: String(booking._id) }).catch(() => {});
        }
      }

      if (canonTo === 'SERVICE_COMPLETED') {
        if (req.user.role === 'staff') {
          return res.status(401).json({ message: 'Only merchant can mark service as completed' });
        }

        const isGeneralService = await isGeneralServiceBooking(booking);
        
        // Skip detailed status requirements for general service
        if (!isGeneralService) {
          if (!booking.inspection?.completedAt) {
            return res.status(400).json({ message: 'Please complete inspection before marking service as completed' });
          }
          if (!booking.qc?.completedAt) {
            return res.status(400).json({ message: 'Please complete QC before marking service as completed' });
          }
        }

        if (!booking.billing?.fileUrl) {
          return res.status(400).json({ message: 'Please upload invoice before marking service as completed' });
        }

        // Reset vehicle health indicators when general service is completed
        if (isGeneralService && booking.vehicle) {
          const Vehicle = (await import('../models/Vehicle.js')).default;
          const vehicle = await Vehicle.findById(booking.vehicle);
          if (vehicle) {
            const keys = ['generalService', 'brakePads', 'tires', 'battery', 'wiperBlade'];
            keys.forEach(key => {
              if (!vehicle.healthIndicators) {
                vehicle.healthIndicators = {};
              }
              vehicle.healthIndicators[key] = {
                value: 0,
                lastUpdated: Date.now(),
                lastServiceDate: Date.now(),
                lastServiceKm: vehicle.mileage || 0,
                fixedKm: vehicle.healthIndicators[key]?.fixedKm || 0,
                fixedDays: vehicle.healthIndicators[key]?.fixedDays || 0
              };
            });
            vehicle.healthPercentBaselineAt = new Date();
            vehicle.markModified('healthIndicators');
            vehicle.markModified('healthPercentBaselineAt');
            await vehicle.save();
            
            // Emit sync event so customer and merchant get updated data
            emitEntitySync('vehicle', 'updated', vehicle);
          }
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
        const isEssentials = await isEssentialsBooking(booking);
        const beforePhotos = Array.isArray(booking.carWash?.beforeWashPhotos) ? booking.carWash.beforeWashPhotos : [];
        const requiredBeforeCount = isEssentials ? 4 : CAR_WASH_MIN_PHOTOS;
        if (beforePhotos.length < requiredBeforeCount) {
          const msg = isEssentials
            ? `Please upload at least 4 before service photos before starting service`
            : `Please upload at least ${CAR_WASH_MIN_PHOTOS} before wash photos before starting car wash`;
          return res.status(400).json({ message: msg });
        }
        
        // Set wash start time
        if (booking.carWash) {
          booking.carWash.washStartedAt = new Date();
        }
      }

      if (canonTo === 'CAR_WASH_COMPLETED') {
        const isEssentials = await isEssentialsBooking(booking);
        const afterPhotos = Array.isArray(booking.carWash?.afterWashPhotos) ? booking.carWash.afterWashPhotos : [];
        const requiredAfterCount = isEssentials ? 4 : CAR_WASH_MIN_PHOTOS;
        if (afterPhotos.length < requiredAfterCount) {
          const msg = isEssentials
            ? `Please upload at least 4 after service photos before completing service`
            : `Please upload at least ${CAR_WASH_MIN_PHOTOS} after wash photos before completing car wash`;
          return res.status(400).json({ message: msg });
        }
        
        // Set wash completion time
        if (booking.carWash) {
          booking.carWash.washCompletedAt = new Date();
        }
      }

      // Battery and Tire specific validations
      const isBatteryTireService = await isBatteryOrTireBooking(booking);
      
      if (isBatteryTireService) {
        // Check merchant assignment for battery/tire services
        if (canonTo === 'STAFF_REACHED_MERCHANT') {
          if (!booking.merchant) {
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
            'Delivery OTP',
            `Your Delivery OTP is ${code}. It expires in 24 hours.`
          ).catch(() => {});
        }
        await sendPushToUser(booking.user?._id, 'Delivery OTP', 'Use the OTP to confirm delivery', { type: 'otp', bookingId: String(booking._id) }).catch(() => {});
      }

        if (canonTo === 'DELIVERY') {
          const isBattery = await isBatteryBooking(booking);
          if (!isBattery) {
            const afterPhotos = Array.isArray(booking.serviceExecution?.afterPhotos)
              ? booking.serviceExecution.afterPhotos
              : [];
            if (afterPhotos.length < BATTERY_AFTER_PHOTOS_REQUIRED) {
              return res.status(400).json({
                message: 'Please upload complete 4 after service photos before delivery',
              });
            }
          }
        }

        if (canonTo === 'COMPLETED') {
          if (!booking.deliveryOtp || !booking.deliveryOtp.verifiedAt) {
            return res.status(400).json({ message: 'OTP verification required before marking as COMPLETED' });
          }
        }
      }

      // OTP gating for delivery — notify out-of-band so staff wait time is not tied to SMTP/push latency
      if (canonTo === 'OUT_FOR_DELIVERY') {
        const code = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 4);
        booking.deliveryOtp = {
          code,
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
          attempts: 0,
          verifiedAt: null
        };
        if (booking.user?.email) {
          void sendEmail(
            booking.user.email,
            'Delivery OTP',
            `Your OTP for vehicle delivery is ${code}. It expires in 20 minutes.`
          ).catch(() => {});
        }
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

      // Single save: workshop timestamps + status (avoids a second PUT /details from the client)
      if (canonTo === 'SERVICE_STARTED' && !booking.serviceExecution?.jobStartTime) {
        if (!booking.serviceExecution) booking.serviceExecution = {};
        booking.serviceExecution.jobStartTime = new Date();
        booking.markModified('serviceExecution');
      }
      if (canonTo === 'SERVICE_COMPLETED' && !booking.serviceExecution?.jobEndTime) {
        if (!booking.serviceExecution) booking.serviceExecution = {};
        booking.serviceExecution.jobEndTime = new Date();
        booking.markModified('serviceExecution');
      }

      booking.status = canonTo;
      const savedBooking = await booking.save();

      setImmediate(() => {
        void queueChatAutomationForBookingStatus(savedBooking, canonTo);
      });

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

      try {
        if (
          ['REACHED_CUSTOMER', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(
            canonTo
          ) &&
          updatedBooking.user
        ) {
          const u = updatedBooking.user;
          const uid =
            typeof u === 'object' && u && u._id ? String(u._id) : String(u);
          await sendLiveTrackingDismissPush(uid, String(updatedBooking._id));
        }
      } catch (_) {}

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
          'Booking Status Update - Carzzi',
          `Dear ${updatedBooking.user.name},\n\nYour booking status has been updated to: ${canonTo}.\n\nCheck your dashboard for more details.`
        ).catch(() => {});
      }
      const paymentStatus = (updatedBooking.paymentStatus || '').toLowerCase();
      const isAlreadyPaid =
        paymentStatus === 'paid' || paymentStatus === 'success';

      if (
        canonTo === 'SERVICE_COMPLETED' &&
        req.user.role === 'merchant' &&
        updatedBooking.user?._id &&
        !isAlreadyPaid
      ) {
        const orderRef =
          updatedBooking.orderNumber ||
          String(updatedBooking._id).slice(-6).toUpperCase();
        const amountDue =
          updatedBooking.finalAmount ?? updatedBooking.totalAmount ?? 0;
        const amountText = Number(amountDue).toLocaleString('en-IN');
        void sendPushToUser(
          updatedBooking.user._id,
          'Service complete — payment due',
          `Your service for booking #${orderRef} is complete. Amount due: ₹${amountText}. Tap Pay to complete payment in the Carzzi app.`,
          {
            type: 'service_completed_payment_pending',
            status: 'SERVICE_COMPLETED',
            bookingId: String(updatedBooking._id),
            amountDue: String(amountDue),
          },
          'service_completed_payment_pending',
          { dataOnly: true }
        ).catch(() => {});
      } else if (
        canonTo === 'SERVICE_STARTED' &&
        req.user.role === 'merchant' &&
        updatedBooking.user?._id
      ) {
        const orderRef =
          updatedBooking.orderNumber ||
          String(updatedBooking._id).slice(-6).toUpperCase();
        void sendPushToUser(
          updatedBooking.user._id,
          'Service Started',
          `Your vehicle service has started for booking #${orderRef}. Our workshop team is now working on your car — track progress in the Carzzi app.`,
          {
            type: 'service_started',
            status: 'SERVICE_STARTED',
            bookingId: String(updatedBooking._id),
          },
          'service_started'
        ).catch(() => {});
      } else if (
        canonTo === 'OUT_FOR_DELIVERY' &&
        updatedBooking.user?._id
      ) {
        const deliveryPin = updatedBooking.deliveryOtp?.code || '';
        if (deliveryPin) {
          void sendCustomerDeliveryOtpPush(updatedBooking, deliveryPin).catch(
            () => {}
          );
        }
      } else if (canonTo === 'DELIVERED' && updatedBooking.user?._id) {
        const orderRef =
          updatedBooking.orderNumber ||
          String(updatedBooking._id).slice(-6).toUpperCase();
        void sendPushToUser(
          updatedBooking.user._id,
          'Feedback',
          `Your vehicle has been delivered for booking #${orderRef}. We hope everything went well — open the Carzzi app to share your feedback and rate your experience.`,
          {
            type: 'feedback',
            status: 'DELIVERED',
            bookingId: String(updatedBooking._id),
          },
          'feedback'
        ).catch(() => {});
        
        // Send WhatsApp feedback message
        if (updatedBooking.user?.phone) {
          try {
            // console.log('[WhatsApp] Sending feedback message to user:', updatedBooking.user.phone);
            const normalizedPhone = normalizeIndianMobile(updatedBooking.user.phone);
            // console.log('[WhatsApp] Normalized phone:', normalizedPhone);
            if (normalizedPhone) {
              const templateName = resolveFeedbackWhatsAppTemplateName();
              // console.log('[WhatsApp] Using template:', templateName);
              
              // Build template components
              const components = {
                body_1: {
                  type: 'text',
                  value: updatedBooking.user.name || 'User'
                },
                body_2: {
                  type: 'text',
                  value: `https://carzzi.com/track/${updatedBooking._id}`
                }
              };
              
              await sendWhatsAppMessage(normalizedPhone, templateName, components);
              // console.log('[WhatsApp] Feedback message sent successfully!');
            }
          } catch (whatsappErr) {
            console.error('[WhatsApp] Failed to send feedback message:', whatsappErr);
          }
        }
      } else {
        sendPushToUser(
          updatedBooking.user?._id,
          'Booking Update',
          `Your booking status is now: ${canonTo}`,
          { type: 'status', status: canonTo, bookingId: String(updatedBooking._id) }
        ).catch(() => {});
      }

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
      void sendEmail(
        booking.user.email,
        'Delivery OTP',
        `Your OTP for vehicle delivery is ${code}. It expires in 20 minutes.`
      ).catch(() => {});
    }
    void sendCustomerDeliveryOtpPush(booking, code).catch(() => {});

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

    emitChatMessage(message.bookingId, populatedMessage);

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
    const finalStatus = isBatteryTireService ? 'COMPLETED' : 'DELIVERED';
    booking.status = finalStatus;
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
    
    // Send WhatsApp message and push notification when delivered or completed
    setImmediate(async () => {
      try {
        if ((finalStatus === 'DELIVERED' || finalStatus === 'COMPLETED') && populated.user?.phone) {
          // console.log('[WhatsApp] Sending feedback message to user (via verifyOTP):', populated.user.phone);
          const normalizedPhone = normalizeIndianMobile(populated.user.phone);
          // console.log('[WhatsApp] Normalized phone:', normalizedPhone);
          if (normalizedPhone) {
            const templateName = resolveFeedbackWhatsAppTemplateName();
            // console.log('[WhatsApp] Using template:', templateName);
            
            const components = {
              body_1: {
                type: 'text',
                value: populated.user.name || 'User'
              },
              body_2: {
                type: 'text',
                value: `https://carzzi.com/track/${populated._id}`
              }
            };
            
            await sendWhatsAppMessage(normalizedPhone, templateName, components);
            // console.log('[WhatsApp] Feedback message sent successfully!');
          }
        }
        
        if ((finalStatus === 'DELIVERED' || finalStatus === 'COMPLETED') && populated.user?._id) {
          const orderRef = populated.orderNumber || String(populated._id).slice(-6).toUpperCase();
          const message = finalStatus === 'DELIVERED'
            ? `Your vehicle has been delivered for booking #${orderRef}. We hope everything went well — open the Carzzi app to share your feedback and rate your experience.`
            : `Your service has been completed for booking #${orderRef}. We hope everything went well — open the Carzzi app to share your feedback and rate your experience.`;
          
          await sendPushToUser(
            populated.user._id,
            'Feedback',
            message,
            {
              type: 'feedback',
              status: finalStatus,
              bookingId: String(populated._id),
            },
            'feedback'
          );
        }
      } catch (err) {
        console.error('[verifyDeliveryOtp] Error sending notifications:', err);
      }
    });
    
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
      if (prePickupPhotos) {
        booking.prePickupPhotos = Array.isArray(prePickupPhotos)
          ? prePickupPhotos.slice(0, 4)
          : prePickupPhotos;
      }
      
      if (inspection) {
        if (!booking.inspection) booking.inspection = {};
        Object.assign(booking.inspection, inspection);
        booking.markModified('inspection');
      }
      if (delay) {
        if (!booking.delay) booking.delay = {};
        Object.assign(booking.delay, delay);
        booking.markModified('delay');
      }
      if (serviceExecution) {
        if (!booking.serviceExecution) booking.serviceExecution = {};
        if (Array.isArray(serviceExecution.afterPhotos)) {
          serviceExecution.afterPhotos = serviceExecution.afterPhotos.slice(0, BATTERY_AFTER_PHOTOS_REQUIRED);
        }
        Object.assign(booking.serviceExecution, serviceExecution);
        booking.markModified('serviceExecution');
      }
      if (qc) {
        if (!booking.qc) booking.qc = {};
        Object.assign(booking.qc, qc);
        booking.markModified('qc');
      }
      if (billing) {
        if (!booking.billing) booking.billing = {};
        Object.assign(booking.billing, billing);
        
        // Recalculate total instead of trusting billing.total from client
        const { total: servicesTotal } = await calculateServicesTotal(booking.services, booking.vehicle);
        
        const partsTotal = Number(booking.billing.partsTotal || 0);
        const labourCost = Number(booking.billing.labourCost || 0);
        const gst = Number(booking.billing.gst || 0);
        const pickupDropPrice = Number(booking.billing.pickupDropPrice || booking.pickupDropPrice || 0);
        
        const calculatedTotal = servicesTotal + partsTotal + labourCost + gst + pickupDropPrice;
        
        booking.totalAmount = calculatedTotal;
        booking.billing.total = calculatedTotal;

        // Support manual discount from billing object
        if (billing.discountAmount !== undefined) {
          booking.discountAmount = Number(billing.discountAmount);
        }

        // Recalculate coupon discount if coupon exists
        if (booking.coupon) {
          try {
            const Coupon = (await import('../models/Coupon.js')).default;
            const coupon = await Coupon.findById(booking.coupon);
            if (coupon && coupon.isActive) {
              let couponDiscount = (calculatedTotal * coupon.discountPercentage) / 100;
              if (coupon.maxDiscountAmount) {
                couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
              }
              booking.discountAmount = couponDiscount;
            }
          } catch (err) {
            console.error('Error recalculating coupon discount:', err);
          }
        }

        booking.finalAmount = Math.max(0, calculatedTotal - (booking.discountAmount || 0));
        
        booking.markModified('billing');

        // If submitting a bill, also mark the service as completed
        if (booking.status === 'SERVICE_STARTED') {
          booking.status = 'SERVICE_COMPLETED';
        }
      }
      if (revisit) {
        if (!booking.revisit) booking.revisit = {};
        Object.assign(booking.revisit, revisit);
        booking.markModified('revisit');
      }
      
      if (parts) {
        booking.parts = parts;
        
        // Recalculate total amount
        const partsTotal = parts.reduce((acc, part) => acc + (part.price * part.quantity), 0);
        
        const { total: servicesTotal } = await calculateServicesTotal(booking.services, booking.vehicle);
        
        const labourCost = Number(booking.billing?.labourCost || 0);
        const gst = Number(booking.billing?.gst || 0);
        const pickupDropPrice = Number(booking.billing?.pickupDropPrice || booking.pickupDropPrice || 0);

        const newTotal = servicesTotal + partsTotal + labourCost + gst + pickupDropPrice;
        
        booking.totalAmount = newTotal;

        // Recalculate coupon discount if coupon exists
        if (booking.coupon) {
          try {
            const Coupon = (await import('../models/Coupon.js')).default;
            const coupon = await Coupon.findById(booking.coupon);
            if (coupon && coupon.isActive) {
              let couponDiscount = (newTotal * coupon.discountPercentage) / 100;
              if (coupon.maxDiscountAmount) {
                couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
              }
              booking.discountAmount = couponDiscount;
            }
          } catch (err) {
            console.error('Error recalculating coupon discount in parts update:', err);
          }
        }

        booking.finalAmount = Math.max(0, newTotal - (booking.discountAmount || 0));
        
        // Update billing partsTotal if billing exists
        if (booking.billing) {
            booking.billing.partsTotal = partsTotal;
            booking.billing.total = newTotal;
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
      emitEntitySync('booking', 'updated', populated);

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

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ message: 'At least one photo is required' });
    }

    // Ensure carWash object exists
    if (!booking.carWash) {
      booking.carWash = { isCarWashService: true };
    }

    const existing = Array.isArray(booking.carWash.beforeWashPhotos)
      ? booking.carWash.beforeWashPhotos
      : [];
    if (existing.length >= CAR_WASH_MAX_PHOTOS) {
      return res.status(400).json({ message: `Maximum ${CAR_WASH_MAX_PHOTOS} before wash photos already uploaded` });
    }

    const merged = [...existing, ...photos].slice(0, CAR_WASH_MAX_PHOTOS);
    if (merged.length > CAR_WASH_MAX_PHOTOS) {
      return res.status(400).json({ message: `Maximum ${CAR_WASH_MAX_PHOTOS} photos allowed` });
    }

    booking.carWash.beforeWashPhotos = merged;
    await booking.save();

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');

    emitBookingUpdate(populated);
    emitEntitySync('booking', 'updated', populated);

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

    const beforePhotos = Array.isArray(booking.carWash.beforeWashPhotos)
      ? booking.carWash.beforeWashPhotos
      : [];
    const isEssentials = await isEssentialsBooking(booking);
    const requiredBeforeCount = isEssentials ? 4 : CAR_WASH_MIN_PHOTOS;
    if (beforePhotos.length < requiredBeforeCount) {
      return res.status(400).json({
        message: isEssentials
          ? `Please upload at least 4 before service photos before starting service`
          : `Please upload at least ${CAR_WASH_MIN_PHOTOS} before wash photos before starting car wash`,
      });
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
      const isEssentials = populated.services?.some(s => s.category?.toLowerCase().includes('essentials'));
      const pushTitle = isEssentials ? 'Service Started' : 'Car Wash Started';
      const pushBody = isEssentials 
        ? `Your service (#${booking.orderNumber}) has been started.`
        : `Your car wash service (#${booking.orderNumber}) has been started.`;

      await sendPushToUser(
        booking.user,
        pushTitle,
        pushBody,
        { bookingId: booking._id.toString(), type: 'car_wash_started' },
        'order'
      );
    } catch (err) {
      
    }

    res.json({ message: isEssentials ? 'Service started successfully' : 'Car wash started successfully', booking: populated });
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

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ message: 'At least one photo is required' });
    }

    // Ensure carWash object exists
    if (!booking.carWash) {
      booking.carWash = { isCarWashService: true };
    }

    const existingAfter = Array.isArray(booking.carWash.afterWashPhotos)
      ? booking.carWash.afterWashPhotos
      : [];
    if (existingAfter.length >= CAR_WASH_MAX_PHOTOS) {
      return res.status(400).json({ message: `Maximum ${CAR_WASH_MAX_PHOTOS} after wash photos already uploaded` });
    }

    const mergedAfter = [...existingAfter, ...photos].slice(0, CAR_WASH_MAX_PHOTOS);
    booking.carWash.afterWashPhotos = mergedAfter;
    await booking.save();

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('carWash.staffAssigned', 'name email phone');

    emitBookingUpdate(populated);
    emitEntitySync('booking', 'updated', populated);

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
    const isEssentials = await isEssentialsBooking(booking);
    const requiredAfterCount = isEssentials ? 4 : CAR_WASH_MIN_PHOTOS;
    if (afterPhotos.length < requiredAfterCount) {
      return res.status(400).json({
        message: isEssentials
          ? `Please upload at least 4 after service photos before completing service`
          : `Please upload at least ${CAR_WASH_MIN_PHOTOS} after wash photos before completing car wash`,
      });
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
      const isEssentials = populated.services?.some(s => s.category?.toLowerCase().includes('essentials'));
      const pushTitle = isEssentials ? 'Service Completed' : 'Car Wash Completed';
      const pushBody = isEssentials 
        ? `Your service (#${booking.orderNumber}) is completed! Your delivery OTP is: ${otpCode}`
        : `Your car wash service (#${booking.orderNumber}) is completed! Your delivery OTP is: ${otpCode}`;

      const pushResult = await sendPushToUser(
        booking.user,
        pushTitle,
        pushBody,
        { bookingId: booking._id.toString(), type: 'car_wash_completed', otp: otpCode },
        'order'
      );
    } catch (err) {
      
    }

    res.json({
      message: isEssentials ? 'Service completed successfully' : 'Car wash completed successfully',
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

/**
 * @desc    Apply coupon to existing booking
 * @route   POST /api/bookings/:id/apply-coupon
 * @access  Private
 */
export const applyCoupon = async (req, res) => {
  const { couponCode } = req.body;
  const bookingId = req.params.id;

  try {
    const booking = await Booking.findById(bookingId).populate('services');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking already paid' });
    }

    const Coupon = (await import('../models/Coupon.js')).default;
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or inactive coupon' });
    }

    // Validate coupon
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({ message: 'Coupon expired' });
    }

    if (coupon.minOrderAmount && booking.totalAmount < coupon.minOrderAmount) {
      return res.status(400).json({ message: `Minimum order of ₹${coupon.minOrderAmount} required` });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    // Check service applicability
    const bookingCategories = booking.services.map(s => s.category);
    const isApplicable = coupon.applicableServices.includes('All') || 
      bookingCategories.some(cat => coupon.applicableServices.includes(cat));

    if (!isApplicable) {
       return res.status(400).json({ message: 'Coupon not applicable for these services' });
    }

    // Calculate discount
    let discountAmount = (booking.totalAmount * coupon.discountPercentage) / 100;
    if (coupon.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }

    booking.coupon = coupon._id;
    booking.discountAmount = discountAmount;
    booking.finalAmount = Math.max(0, booking.totalAmount - discountAmount);

    await booking.save();
    
    // Increment usage
    coupon.usageCount += 1;
    await coupon.save();

    const populated = await Booking.findById(booking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('coupon');

    emitBookingUpdate(populated);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
