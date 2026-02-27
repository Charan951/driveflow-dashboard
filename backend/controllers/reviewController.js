import Review from '../models/Review.js';
import Booking from '../models/Booking.js';

// @desc    Get public reviews
// @route   GET /api/reviews/public
// @access  Public
export const getPublicReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ 
      category: 'Platform', 
      isAccepted: true,
      isVisible: true 
    })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reviews (Admin)
// @route   GET /api/reviews/all
// @access  Private/Admin
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('reviewer', 'name email')
      .populate('target', 'name email role')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check for pending feedback on delivered/completed bookings
// @route   GET /api/reviews/check-pending-feedback
// @access  Private
export const checkPendingFeedback = async (req, res) => {
  try {
    const deliveredBookings = await Booking.find({
      user: req.user._id,
      status: { $in: ['DELIVERED', 'COMPLETED'] }
    });

    for (const booking of deliveredBookings) {
      const reviews = await Review.find({ booking: booking._id });
      const categories = reviews.map(r => r.category);
      
      const hasMerchantReview = categories.includes('Merchant');
      const hasPlatformReview = categories.includes('Platform');

      if (!hasMerchantReview || !hasPlatformReview) {
        return res.json({ 
          hasPending: true, 
          bookingId: booking._id,
          orderNumber: booking.orderNumber || booking._id.toString().slice(-6).toUpperCase()
        });
      }
    }

    res.json({ hasPending: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  const { target, booking, rating, comment, category } = req.body;

  try {
    const review = new Review({
      reviewer: req.user._id,
      target,
      booking,
      rating,
      comment,
      category,
    });

    const createdReview = await review.save();
    res.status(201).json(createdReview);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get reviews for a specific target (Merchant/Staff)
// @route   GET /api/reviews/target/:targetId
// @access  Private
export const getTargetReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ target: req.params.targetId })
      .populate('reviewer', 'name')
      .populate({
        path: 'booking',
        populate: {
          path: 'vehicle services',
          select: 'make model licensePlate name'
        }
      })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (review) {
      await review.deleteOne();
      res.json({ message: 'Review removed' });
    } else {
      res.status(404).json({ message: 'Review not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update review status (isAccepted/isVisible)
// @route   PUT /api/reviews/:id/status
// @access  Private/Admin
export const updateReviewStatus = async (req, res) => {
  const { isAccepted, isVisible } = req.body;
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (isAccepted !== undefined) review.isAccepted = isAccepted;
    if (isVisible !== undefined) review.isVisible = isVisible;

    const updatedReview = await review.save();
    res.json(updatedReview);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
