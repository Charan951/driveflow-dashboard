import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Star, ThumbsUp, MessageSquare, Trash2, User } from 'lucide-react';
import { reviewService, Review } from '../../services/reviewService';
import { toast } from 'react-hot-toast';

const AdminFeedbackPage = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterRating, setFilterRating] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const data = await reviewService.getAllReviews();
      setReviews(data);
    } catch (error) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await reviewService.deleteReview(id);
      toast.success('Review deleted');
      setReviews(reviews.filter(r => r._id !== id));
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesCategory = filterCategory === 'All' || review.category === filterCategory;
    const matchesRating = filterRating === 'All' || review.rating === parseInt(filterRating);
    const matchesSearch = 
      review.reviewer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.target?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.comment || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesRating && matchesSearch;
  });

  const stats = {
    averageRating: reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
      : '0.0',
    totalReviews: reviews.length,
    merchantReviews: reviews.filter(r => r.category === 'Merchant').length,
    staffReviews: reviews.filter(r => r.category === 'Staff').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Ratings & Feedback</h1>
        <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center">
            <Star className="mr-2 fill-current" size={16} />
            Average Rating: {stats.averageRating} / 5.0
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Reviews</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalReviews}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <MessageSquare size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Merchant Reviews</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.merchantReviews}</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <User size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Staff Reviews</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.staffReviews}</h3>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <User size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search reviewer, target, or comment..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter size={20} className="text-gray-400" />
          <select
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Merchant">Merchant</option>
            <option value="Staff">Staff</option>
            <option value="Platform">Platform</option>
          </select>
          <select
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <option value="All">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReviews.map((review) => (
          <div key={review._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group">
            <button 
                onClick={() => handleDeleteReview(review._id)}
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 size={18} />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {review.reviewer?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-medium text-gray-800">{review.reviewer?.name}</h4>
                <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center mb-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={`${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                />
              ))}
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              "{review.comment}"
            </p>

            <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-sm">
                <span className="text-gray-500">Review for:</span>
                <span className="font-medium text-gray-800 bg-gray-100 px-2 py-1 rounded">
                    {review.target?.name || review.category}
                </span>
            </div>
          </div>
        ))}
      </div>
      
      {filteredReviews.length === 0 && (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            No reviews found matching your filters.
          </div>
      )}
    </div>
  );
};

export default AdminFeedbackPage;
