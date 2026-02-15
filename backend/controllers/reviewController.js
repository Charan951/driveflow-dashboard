import Review from '../models/Review.js';

// @desc    Get public reviews
// @route   GET /api/reviews/public
// @access  Public
export const getPublicReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isVisible: true })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 })
      .limit(10); // Limit to latest 10 reviews
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
