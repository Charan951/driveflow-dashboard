import api from './api';

export interface Review {
  _id: string;
  rating: number;
  comment: string;
  category: string;
  createdAt: string;
  reviewer: {
    _id: string;
    name: string;
  };
  target: {
    _id: string;
    name: string;
  };
}

export interface ReviewData {
  target?: string;
  booking?: string;
  rating: number;
  comment: string;
  category: 'Merchant' | 'Staff' | 'Platform';
}

export const reviewService = {
  getAllReviews: async (): Promise<Review[]> => {
    const response = await api.get('/reviews/all');
    return response.data;
  },

  createReview: async (reviewData: ReviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },

  deleteReview: async (id: string) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },

  getPublicReviews: async (): Promise<Review[]> => {
    const response = await api.get('/reviews/public');
    return response.data;
  },

  getTargetReviews: async (targetId: string): Promise<Review[]> => {
    const response = await api.get(`/reviews/target/${targetId}`);
    return response.data;
  },

  updateReviewStatus: async (id: string, status: { isAccepted?: boolean; isVisible?: boolean }) => {
    const response = await api.put(`/reviews/${id}/status`, status);
    return response.data;
  },

  checkPendingFeedback: async (): Promise<{ hasPending: boolean; bookingId?: string; orderNumber?: string }> => {
    const response = await api.get('/reviews/check-pending-feedback');
    return response.data;
  },
};
