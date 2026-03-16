import Booking from '../models/Booking.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { emitBookingUpdate } from './bookingController.js';
import { sendPushToUser } from '../utils/pushService.js';

/**
 * @desc    Process dummy payment (replaces Razorpay)
 * @route   POST /api/payments/dummy-pay
 * @access  Private
 */
export const dummyPayment = async (req, res) => {
  const { bookingId, tempBookingData } = req.body;

  try {
    console.log('Payment request received:', { bookingId, tempBookingData });

    // Handle temporary booking creation after payment (Car Wash, Battery, Tires)
    if (tempBookingData && tempBookingData.requiresPaymentService) {
      console.log('Processing payment-required service with temp data:', tempBookingData);
      
      // Import required models
      const Counter = (await import('../models/Counter.js')).default;
      const Service = (await import('../models/Service.js')).default;
      
      // Create the actual booking after successful payment
      const MAX_RETRIES = 5;
      let lastError = null;
      let createdBooking = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const orderNumber = await Counter.next('booking');
          const booking = new Booking({
            user: tempBookingData.user || req.user._id,
            vehicle: tempBookingData.vehicleId,
            services: tempBookingData.serviceIds,
            date: tempBookingData.date,
            orderNumber,
            notes: tempBookingData.notes,
            location: tempBookingData.location,
            totalAmount: tempBookingData.totalAmount,
            paymentStatus: 'paid', // Payment completed
            status: 'CREATED', // Created after payment
            paymentId: `dummy_pay_${crypto.randomBytes(8).toString('hex')}`,
            carWash: {
              isCarWashService: tempBookingData.requiresPaymentService,
              beforeWashPhotos: [],
              afterWashPhotos: [],
            }
          });

          // Calculate platform commission (10%)
          const commissionRate = 0.10;
          booking.platformFee = tempBookingData.totalAmount * commissionRate;
          booking.merchantEarnings = tempBookingData.totalAmount - booking.platformFee;

          console.log('Attempting to save booking:', booking);
          createdBooking = await booking.save();
          console.log('Booking saved successfully:', createdBooking._id);
          break;
        } catch (err) {
          console.error('Error saving booking:', err);
          lastError = err;
          const isDuplicate =
            err &&
            err.code === 11000 &&
            (err.keyPattern?.orderNumber || String(err.message || '').includes('orderNumber_1'));

          if (!isDuplicate) {
            throw err;
          }

          // Align counter with current max orderNumber
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
        console.error('Failed to create booking after retries:', lastError);
        throw lastError || new Error('Failed to create booking with unique order number');
      }

      // Populate for real-time consumers
      const populated = await Booking.findById(createdBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('merchant', 'name email phone location')
        .populate('pickupDriver', 'name email phone')
        .populate('technician', 'name email phone')
        .populate('carWash.staffAssigned', 'name email phone');

      // Emit socket event for real-time updates
      emitBookingUpdate(populated);

      // Send confirmation email
      if (req.user.email) {
        const services = await Service.find({ _id: { $in: tempBookingData.serviceIds } });
        const serviceNames = services.map(s => s.name).join(', ');
        const serviceType = services.some(s => s.category === 'Car Wash' || s.category === 'Wash') 
          ? 'Car Wash' 
          : services.some(s => s.category === 'Battery' || s.category === 'Tyre & Battery')
          ? 'Battery'
          : 'Tire';
        
        const { sendEmail } = await import('../utils/emailService.js');
        sendEmail(
          req.user.email,
          `${serviceType} Service Booking Confirmed`,
          `Dear User,\n\nYour ${serviceType.toLowerCase()} service booking for ${serviceNames} has been confirmed after payment.\nDate: ${new Date(tempBookingData.date).toLocaleDateString()}\nTotal Amount: ₹${tempBookingData.totalAmount}\nOrder Number: #${createdBooking.orderNumber}\n\nAdmin will assign staff to your booking shortly.\n\nThank you for choosing DriveFlow!`
        ).catch(emailError => console.error('Email sending failed:', emailError));
      }

      // Notify customer about successful booking creation
      const serviceType = await Service.findOne({ _id: { $in: tempBookingData.serviceIds } });
      const notificationTitle = serviceType?.category === 'Car Wash' || serviceType?.category === 'Wash'
        ? 'Car Wash Booking Confirmed'
        : serviceType?.category === 'Battery' || serviceType?.category === 'Tyre & Battery'
        ? 'Battery Service Booking Confirmed'
        : 'Tire Service Booking Confirmed';
        
      await sendPushToUser(
        req.user._id,
        notificationTitle,
        `Payment successful! Your service booking #${createdBooking.orderNumber} has been created. Admin will assign staff shortly.`,
        { type: 'service_confirmed', bookingId: createdBooking._id.toString() }
      );

      console.log('Payment-required service completed successfully:', createdBooking._id);
      return res.json({ 
        message: 'Payment successful and booking created',
        bookingId: createdBooking._id,
        orderNumber: createdBooking.orderNumber,
        paymentId: createdBooking.paymentId,
        status: 'paid'
      });
    }

    // Handle existing booking payment (regular services)
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check ownership
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to pay for this booking' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.json({ message: 'Payment already completed', booking });
    }

    // Process dummy payment for existing booking
    booking.paymentStatus = 'paid';
    booking.paymentId = `dummy_pay_${crypto.randomBytes(8).toString('hex')}`;
    
    // Calculate platform commission (10%)
    const commissionRate = 0.10;
    booking.platformFee = booking.totalAmount * commissionRate;
    booking.merchantEarnings = booking.totalAmount - booking.platformFee;
    
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

    // Notify customer and relevant parties
    const bookingIdStr = String(populated._id);
    const orderNum = populated.orderNumber || bookingIdStr.slice(-6).toUpperCase();
    
    if (booking.carWash?.isCarWashService) {
      // Car wash specific notifications
      await sendPushToUser(
        booking.user,
        'Car Wash Payment Confirmed',
        `Payment for car wash service #${orderNum} has been confirmed. Admin will assign staff to your booking shortly.`,
        { type: 'car_wash_confirmed', bookingId: bookingIdStr }
      );
    } else {
      // Regular service notifications
      if (populated.merchant?._id) {
        await sendPushToUser(
          populated.merchant._id,
          'Payment Received',
          `Payment for booking #${orderNum} has been completed.`,
          { type: 'payment_update', bookingId: bookingIdStr }
        );
      }
      
      if (populated.pickupDriver?._id) {
        await sendPushToUser(
          populated.pickupDriver._id,
          'Payment Completed',
          `Customer has paid for booking #${orderNum}. You can now proceed with delivery.`,
          { type: 'payment_update', bookingId: bookingIdStr }
        );
      }
    }

    res.json({ 
      message: booking.carWash?.isCarWashService ? 'Car wash payment successful and confirmed' : 'Dummy payment successful', 
      bookingId: booking._id,
      paymentId: booking.paymentId,
      status: 'paid'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Legacy Razorpay endpoints (Dummy placeholders)
 */
export const createOrder = async (req, res) => {
    res.status(410).json({ message: 'Razorpay integration removed. Use /api/payments/dummy-pay instead.' });
};

export const verifyPayment = async (req, res) => {
    res.status(410).json({ message: 'Razorpay integration removed. Use /api/payments/dummy-pay instead.' });
};

export const getAllPayments = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'name email')
      .populate('merchant', 'name')
      .populate('vehicle', 'make model registrationNumber')
      .sort({ createdAt: -1 });
      
    const payments = bookings.map(booking => ({
      _id: booking._id,
      bookingId: booking._id,
      user: booking.user,
      merchant: booking.merchant,
      vehicle: booking.vehicle,
      amount: booking.totalAmount,
      status: booking.paymentStatus,
      date: booking.createdAt,
      paymentId: booking.paymentId,
      platformFee: booking.platformFee || 0,
      merchantEarnings: booking.merchantEarnings || 0,
      billing: booking.billing,
    }));
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
