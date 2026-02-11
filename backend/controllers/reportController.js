import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Service from '../models/Service.js';
import Product from '../models/Product.js';
import ApprovalRequest from '../models/ApprovalRequest.js';

// @desc    Get dashboard summary stats
// @route   GET /api/reports/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalVehicles,
      totalBookings,
      todaysBookings,
      pendingBookings,
      revenueToday,
      vehiclesOnRoad,
      vehiclesInService,
      waitingPickup,
      waitingDelivery,
      pendingBills,
      pendingApprovals,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Vehicle.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: today } }),
      Booking.countDocuments({ status: 'Pending' }),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Vehicle.countDocuments({ status: 'On Route' }),
      Vehicle.countDocuments({ status: 'In Service' }),
      Booking.countDocuments({ status: { $in: ['CREATED', 'ASSIGNED'] } }),
      Booking.countDocuments({ status: 'SERVICE_COMPLETED' }),
      Booking.countDocuments({ paymentStatus: 'pending', status: { $ne: 'CANCELLED' } }),
      ApprovalRequest.countDocuments({ status: 'Pending', type: { $ne: 'UserRegistration' } }),
    ]);

    res.json({
      totalCustomers,
      totalVehicles,
      totalBookings,
      todaysBookings,
      pendingBookings,
      revenueToday: revenueToday[0]?.total || 0,
      vehiclesOnRoad,
      vehiclesInService,
      waitingPickup,
      waitingDelivery,
      pendingBills,
      pendingApprovals,
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
