import '../core/api_client.dart';
import '../core/env.dart';
import '../models/booking.dart';

class BookingService {
  final ApiClient _api = ApiClient();

  Future<List<BookingSummary>> getMyBookings() async {
    final data = await _api.getAny(ApiEndpoints.myBookings);
    if (data is List) {
      return data
          .whereType<Map<String, dynamic>>()
          .map((json) => BookingSummary.fromJson(json))
          .toList();
    }
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<BookingDetail> getBookingById(String id) async {
    final data = await _api.getJson(ApiEndpoints.bookingById(id));
    return BookingDetail.fromJson(data);
  }

  Future<void> updateBookingStatus(String id, String status) async {
    await _api.putJson(
      ApiEndpoints.bookingStatus(id),
      body: {'status': status},
    );
  }

  Future<void> verifyDeliveryOtp(String id, String otp) async {
    await _api.postJson(ApiEndpoints.bookingVerifyOtp(id), body: {'otp': otp});
  }
}
