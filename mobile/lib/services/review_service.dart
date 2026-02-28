import '../core/api_client.dart';

class ReviewService {
  final ApiClient _api = ApiClient();

  Future<Map<String, dynamic>> checkPendingFeedback() async {
    final res = await _api.getAny('/reviews/check-pending-feedback');
    if (res is Map<String, dynamic>) return res;
    if (res is Map) return Map<String, dynamic>.from(res);
    return {'hasPending': false};
  }

  Future<List<Map<String, dynamic>>> getBookingReviews(String bookingId) async {
    final res = await _api.getAny('/reviews/all');
    if (res is List) {
      final items = <Map<String, dynamic>>[];
      for (final e in res) {
        if (e is Map) {
          final map = e is Map<String, dynamic>
              ? e
              : Map<String, dynamic>.from(e);
          final bId = map['booking'];
          if (bId is String && bId == bookingId) {
            items.add(map);
          } else if (bId is Map && bId['_id'] == bookingId) {
            items.add(map);
          }
        }
      }
      return items;
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
