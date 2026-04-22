import '../core/api_client.dart';

class ReviewService {
  final ApiClient _api = ApiClient();

  Future<List<Map<String, dynamic>>> getBookingReviews(String bookingId) async {
    final res = await _api.getAny('/reviews/booking/$bookingId');
    if (res is List) {
      return res.map((e) => Map<String, dynamic>.from(e)).toList();
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> getMyReviews() async {
    final res = await _api.getAny('/reviews/myreviews');
    if (res is List) {
      return res.map((e) => Map<String, dynamic>.from(e)).toList();
    }
    return [];
  }

  Future<void> createReview({
    required String bookingId,
    required int rating,
    required String comment,
    required String category,
    String? targetId,
  }) async {
    await _api.postJson(
      '/reviews',
      body: {
        'booking': bookingId,
        'rating': rating,
        'comment': comment,
        'category': category,
        'target': targetId,
      },
    );
  }
}
