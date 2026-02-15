import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Car, Wrench } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { reviewService } from '@/services/reviewService';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: {
    name: string;
  };
  booking?: {
    vehicle?: {
      make: string;
      model: string;
      licensePlate: string;
    };
    services?: Array<{
      name: string;
    }>;
  };
}

const Feedback: React.FC = () => {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user?._id) return;
      
      try {
        const data = await reviewService.getTargetReviews(user._id);
        // Cast the data to unknown first if types don't match exactly, 
        // but generally we trust the backend response structure here.
        // We might need to adjust based on actual API response.
        setReviews(data as unknown as Review[]);
        
        // Calculate average rating
        if (data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const total = data.reduce((sum: number, r: any) => sum + r.rating, 0);
          setAverageRating(Number((total / data.length).toFixed(1)));
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        toast.error('Failed to load customer feedback');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customer Feedback</h1>
        {reviews.length > 0 && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
            Average Rating: {averageRating} / 5.0
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No feedback yet</h3>
          <p className="text-muted-foreground">Reviews from your customers will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {reviews.map((review) => (
            <motion.div
              key={review._id}
              variants={itemVariants}
              className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Rating Section */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[100px] border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-6">
                  <div className="text-4xl font-bold text-gray-900 mb-2">{review.rating}.0</div>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Content Section */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-semibold text-lg text-gray-900">{review.reviewer?.name || 'Anonymous'}</h3>
                    
                    {review.booking && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {review.booking.vehicle && (
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                    <Car className="w-3 h-3" /> 
                                    {review.booking.vehicle.make} {review.booking.vehicle.model} ({review.booking.vehicle.licensePlate})
                                </span>
                            )}
                            {review.booking.services && review.booking.services.length > 0 && (
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                    <Wrench className="w-3 h-3" /> 
                                    {review.booking.services.map(s => s.name).join(', ')}
                                </span>
                            )}
                        </div>
                    )}
                  </div>

                  <div className="relative bg-muted/30 p-4 rounded-lg">
                    <MessageSquare className="absolute top-4 left-3 w-4 h-4 text-muted-foreground opacity-50" />
                    <p className="pl-6 text-gray-700 italic">"{review.comment}"</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Feedback;
