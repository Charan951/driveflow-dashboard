import 'dart:io';
import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../core/env.dart';
import '../models/booking.dart';

class BookingService {
  final ApiClient _api = ApiClient();

  Future<List<BookingSummary>> getMyBookings() async {
    final data = await _api.getAny(ApiEndpoints.myBookings);
    final items = <BookingSummary>[];
    if (data is List) {
      for (final e in data) {
        try {
          if (e is Map<String, dynamic>) {
            items.add(BookingSummary.fromJson(e));
          } else if (e is Map) {
            items.add(BookingSummary.fromJson(Map<String, dynamic>.from(e)));
          }
        } catch (err) {
          debugPrint('Error parsing booking summary: $err');
        }
      }
      return items;
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

  Future<Map<String, dynamic>> getMerchantStats() async {
    final bookings = await getMyBookings();

    final activeStatuses = [
      'CREATED',
      'ASSIGNED',
      'ACCEPTED',
      'REACHED_CUSTOMER',
      'VEHICLE_PICKED',
      'REACHED_MERCHANT',
      'VEHICLE_AT_MERCHANT',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
    ];

    final active = bookings
        .where((b) => activeStatuses.contains(b.status))
        .length;
    final completed = bookings.where((b) => b.status == 'DELIVERED').length;
    // For pending bills, we need full booking detail or a different endpoint
    // But for now, let's just count based on status or assume all active need bills
    final pendingBills = bookings
        .where((b) => b.status == 'SERVICE_COMPLETED')
        .length;

    return {
      'activeOrders': active,
      'completedOrders': completed,
      'pendingBills': pendingBills,
    };
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

  Future<void> updateBookingDetails(
    String id,
    Map<String, dynamic> data,
  ) async {
    await _api.putJson(ApiEndpoints.bookingDetails(id), body: data);
  }

  Future<List<String>> uploadFiles(List<File> files) async {
    final uploaded = await _api.uploadFiles(ApiEndpoints.uploadMultiple, files);
    return uploaded
        .map((e) => e is Map<String, dynamic> ? e['url']?.toString() : null)
        .whereType<String>()
        .toList();
  }

  Future<void> createApproval(Map<String, dynamic> data) async {
    await _api.postJson('/approvals', body: data);
  }
}
