import 'dart:io';

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

  Future<void> updatePrePickupPhotos(String id, List<String> urls) async {
    await _api.putJson(
      ApiEndpoints.bookingDetails(id),
      body: {'prePickupPhotos': urls},
    );
  }

  Future<List<String>> uploadPrePickupPhotos(
    String id,
    List<File> files, {
    List<String> existing = const [],
  }) async {
    final uploaded = await _api.uploadFiles(ApiEndpoints.uploadMultiple, files);
    final newUrls = uploaded
        .map((e) => e is Map<String, dynamic> ? e['url']?.toString() : null)
        .whereType<String>()
        .toList();
    final allUrls = <String>[...existing, ...newUrls];
    await updatePrePickupPhotos(id, allUrls);
    return allUrls;
  }
}
