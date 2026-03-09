import '../../core/api_client.dart';
import '../../core/env.dart';

class Review {
  final String id;
  final String? bookingId;
  final String? userId;
  final String? merchantId;
  final int rating;
  final String comment;
  final String? createdAt;

  Review({
    required this.id,
    this.bookingId,
    this.userId,
    this.merchantId,
    required this.rating,
    required this.comment,
    this.createdAt,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['_id'] ?? '',
      bookingId: json['booking'] is Map ? json['booking']['_id'] : json['booking'],
      userId: json['user'] is Map ? json['user']['name'] : json['user'],
      merchantId: json['merchant'],
      rating: json['rating'] ?? 0,
      comment: json['comment'] ?? '',
      createdAt: json['createdAt'],
    );
  }
}

class ReviewService {
  final ApiClient _api = ApiClient();

  Future<List<Review>> getMerchantReviews(String merchantId) async {
    final response = await _api.getAny('${ApiEndpoints.reviews}/target/$merchantId');
    if (response is List) {
      return response.map((json) => Review.fromJson(json)).toList();
    }
    return [];
  }
}
