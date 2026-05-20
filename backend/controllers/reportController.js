import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Service from '../models/Service.js';
import Product from '../models/Product.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import Ticket from '../models/Ticket.js';

// @desc    Export report as CSV
// @route   GET /api/reports/export
// @access  Private/Admin
export const exportReport = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('merchant', 'name email')
      .populate('services', 'name')
      .sort({ createdAt: -1 });

    const csvHeader = 'Booking ID,Customer Name,Customer Email,Merchant Name,Merchant Email,Services,Total Amount,Payment Status,Booking Status,Date\n';
    const csvRows = bookings.map(booking => {
      const date = new Date(booking.createdAt);
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      const serviceNames = booking.services?.map(s => s.name).join('; ') || 'N/A';
      return [
        booking._id,
        `"${booking.user?.name || 'N/A'}"`,
        `"${booking.user?.email || 'N/A'}"`,
        `"${booking.merchant?.name || 'N/A'}"`,
        `"${booking.merchant?.email || 'N/A'}"`,
        `"${serviceNames}"`,
        booking.totalAmount || 0,
        booking.paymentStatus || 'N/A',
        booking.status || 'N/A',
        formattedDate
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="carzzi-reports.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard summary stats
// @route   GET /api/reports/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        { $group: { _id: '$user' } },
        { $count: 'count' }
      ]),
      Vehicle.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: today } }),
      Booking.countDocuments({ status: { $in: ['CREATED', 'ASSIGNED', 'Pending'] } }),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Vehicle.countDocuments({ status: 'On Route' }),
      Vehicle.countDocuments({ status: 'In Service' }),
      Booking.countDocuments({ status: { $in: ['CREATED', 'ASSIGNED'] } }),
      Booking.countDocuments({ status: 'SERVICE_COMPLETED' }),
      Booking.countDocuments({ paymentStatus: 'pending', status: { $ne: 'CANCELLED' } }),
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

// @desc    Get revenue analytics (Last 7 days)
// @route   GET /api/reports/revenue
// @access  Private/Admin
export const getRevenueAnalytics = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$totalAmount' },
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
    const services = await Booking.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
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
    const merchants = await Booking.aggregate([
      { $match: { merchant: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$merchant',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
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
