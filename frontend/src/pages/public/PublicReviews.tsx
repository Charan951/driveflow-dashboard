import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, User } from 'lucide-react';
import { reviewService, Review } from '../../services/reviewService';
import { toast } from 'sonner';

const PublicReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await reviewService.getPublicReviews();
        if (Array.isArray(data)) {
          setReviews(data);
        } else {
          console.error('Invalid reviews data format:', data);
          setReviews([]);
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        toast.error('Failed to load reviews');
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=2000"
            alt="Reviews Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Customer Reviews
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              Get your bike and car serviced at the most trusted service center.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Reviews Grid */}
      <div className="container mx-auto px-4 py-16 -mt-20 relative z-20">
        <div className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-border/50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 text-foreground">What our customers say</h2>
            <div className="w-20 h-1 bg-primary mx-auto rounded-full" />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-card/50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : reviews && reviews.length > 0 ? (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {reviews.map((review) => (
                <motion.div 
                  key={review._id}
                  variants={itemVariants}
                  className="bg-card border border-border/50 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow relative"
                >
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/20" />
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{review.reviewer?.name || 'Anonymous'}</h3>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                            />
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground italic mb-4">
                    "{review.comment}"
                  </p>

                  <div className="text-sm text-muted-foreground/60">
                    {(() => {
                      const date = review.createdAt ? new Date(review.createdAt) : null;
                      return date && !isNaN(date.getTime()) ? date.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Date unavailable';
                    })()}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No reviews yet. Be the first to share your experience!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicReviews;
