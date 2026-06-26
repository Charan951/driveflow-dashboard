import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Service from '../models/Service.js';
import Product from '../models/Product.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import Ticket from '../models/Ticket.js';
import Payment from '../models/Payment.js';
import { formatOrderReference } from '../utils/orderNumber.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const escapeCsvCell = (value) => {
  const str = value == null || value === '' ? 'N/A' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatExportDate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

/** Subtotal (after coupon), tax, and total where total = subtotal + tax. */
const getExportAmounts = (booking) => {
  const discount = Number(booking.discountAmount) || 0;
  const baseSubtotal = Number(booking.totalAmount) || 0;
  const subtotal = round2(Math.max(0, baseSubtotal - discount));

  const checkoutTax = Number(booking.gstAmount);
  const billingTax = Number(booking.billing?.gst);
  const tax = round2(
    Number.isFinite(checkoutTax) && checkoutTax > 0
      ? checkoutTax
      : Number.isFinite(billingTax)
        ? billingTax
        : 0
  );

  const total = round2(subtotal + tax);
  return { subtotal, tax, total };
};

const getAssignedStaffLabel = (booking) => {
  const names = [];
  const addName = (user) => {
    const name = user?.name?.trim();
    if (name && !names.includes(name)) names.push(name);
  };

  addName(booking.pickupDriver);
  addName(booking.technician);
  addName(booking.carWash?.staffAssigned);

  return names.length > 0 ? names.join('; ') : 'N/A';
};

// @desc    Export report as CSV
// @route   GET /api/reports/export
// @access  Private/Admin
export const exportReport = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const bookings = await Booking.find(dateFilter)
      .populate('user', 'name email')
      .populate('merchant', 'name email')
      .populate('pickupDriver', 'name')
      .populate('technician', 'name')
      .populate('carWash.staffAssigned', 'name')
      .populate('services', 'name')
      .sort({ createdAt: -1 });

    const csvHeader =
      'Booking ID,Customer Name,Customer Email,Staff,Merchant Name,Merchant Email,Services,Subtotal,Tax,Total Amount,Payment Status,Booking Status,Date\n';

    const csvRows = bookings
      .map((booking) => {
        const { subtotal, tax, total } = getExportAmounts(booking);
        const serviceNames =
          booking.services?.map((s) => s?.name).filter(Boolean).join('; ') || 'N/A';

        return [
          escapeCsvCell(formatOrderReference(booking)),
          escapeCsvCell(booking.user?.name),
          escapeCsvCell(booking.user?.email),
          escapeCsvCell(getAssignedStaffLabel(booking)),
          escapeCsvCell(booking.merchant?.name),
          escapeCsvCell(booking.merchant?.email),
          escapeCsvCell(serviceNames),
          subtotal,
          tax,
          total,
          escapeCsvCell(booking.paymentStatus),
          escapeCsvCell(booking.status),
          formatExportDate(booking.createdAt),
        ].join(',');
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="carzzi-reports.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to build date filter
const buildDateFilter = (query) => {
  const filter = {};
  const { startDate, endDate } = query;
  
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { ...filter.createdAt, $gte: start };
    }
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $lte: end };
    }
  }
  
  return filter;
};

// @desc    Get dashboard summary stats
// @route   GET /api/reports/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      activeCustomers,
      totalVehicles,
      totalBookings,
      todaysBookings,
      pendingBookings,
      revenueToday,
      totalRevenue,
      vehiclesOnRoad,
      vehiclesInService,
      waitingPickup,
      waitingDelivery,
      pendingBills,
      pendingApprovals,
      openTickets,
    ] = await Promise.all([
      Booking.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$user' } },
        { $count: 'count' }
      ]),
      Vehicle.countDocuments(),
      Booking.countDocuments(dateFilter),
      Booking.countDocuments({ ...dateFilter, date: { $gte: today, $lt: tomorrow } }),
      Booking.countDocuments({
        ...dateFilter,
        status: {
          $in: [
            'ASSIGNED',
            'ACCEPTED',
            'REACHED_CUSTOMER',
            'VEHICLE_PICKED',
            'REACHED_MERCHANT',
            'SERVICE_STARTED',
            'SERVICE_COMPLETED',
            'OUT_FOR_DELIVERY',
            'CAR_WASH_STARTED',
            'CAR_WASH_COMPLETED',
            'STAFF_REACHED_MERCHANT',
            'PICKUP_BATTERY_TIRE',
            'INSTALLATION',
            'DELIVERY',
            'MERCHANT_INSPECTION',
            'PENDING_APPROVAL'
          ]
        }
      }),
      Booking.aggregate([
        { $match: { ...dateFilter, paymentStatus: 'paid', date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Booking.aggregate([
        { $match: { ...dateFilter, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Vehicle.countDocuments({ status: 'On Route' }),
      Vehicle.countDocuments({ status: 'In Service' }),
      Booking.countDocuments({ ...dateFilter, status: { $in: ['CREATED', 'ASSIGNED'] } }),
      Booking.countDocuments({ ...dateFilter, status: 'SERVICE_COMPLETED' }),
      Payment.countDocuments({ ...dateFilter, status: 'pending' }),
      ApprovalRequest.countDocuments({ status: 'Pending', type: { $ne: 'UserRegistration' } }),
      Ticket.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
    ]);

    res.json({
      totalCustomers: activeCustomers[0]?.count || 0,
      totalVehicles,
      totalBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      todaysBookings,
      pendingBookings,
      revenueToday: revenueToday[0]?.total || 0,
      vehiclesOnRoad,
      vehiclesInService,
      waitingPickup,
      waitingDelivery,
      pendingBills,
      pendingApprovals,
      openTickets,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get revenue analytics
// @route   GET /api/reports/revenue
// @access  Private/Admin
export const getRevenueAnalytics = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const filter = Object.keys(dateFilter).length > 0 ? dateFilter : { createdAt: { $gte: sevenDaysAgo } };

    const revenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          ...filter,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$finalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(revenue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get top performing services
// @route   GET /api/reports/top-services
// @access  Private/Admin
export const getTopServices = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const services = await Booking.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$serviceType', count: { $sum: 1 }, revenue: { $sum: '$finalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get merchant performance
// @route   GET /api/reports/merchants
// @access  Private/Admin
export const getMerchantPerformance = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const merchants = await Booking.aggregate([
      { $match: { ...dateFilter, merchant: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$merchant',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'merchantDetails',
        },
      },
      { $unwind: '$merchantDetails' },
      {
        $project: {
          _id: 1,
          totalBookings: 1,
          totalRevenue: 1,
          name: '$merchantDetails.name',
          email: '$merchantDetails.email',
        },
      },
    ]);
    res.json(merchants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
