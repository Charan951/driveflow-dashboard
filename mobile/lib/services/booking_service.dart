import '../core/api_client.dart';
import '../core/env.dart';
import '../models/booking.dart';

class BookingService {
  final ApiClient _api = ApiClient();

  static List<Booking>? _cachedMyBookings;
  static DateTime? _lastMyBookingsFetchAt;
  static const Duration _cacheDuration = Duration(minutes: 2);

  Future<dynamic> createBooking({
    required String vehicleId,
    required List<String> serviceIds,
    required DateTime date,
    String? notes,
    BookingLocation? location,
  }) async {
    final res = await _api.postAny(
      ApiEndpoints.bookings,
      body: {
        'vehicleId': vehicleId,
        'serviceIds': serviceIds,
        'date': date.toIso8601String(),
        if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        if (location != null) 'location': location.toJson(),
      },
    );

    // Handle special "requiresPayment" response for Car Wash, Battery, Tires
    if (res is Map<String, dynamic> && res['requiresPayment'] == true) {
      return res; // Return the full response for special handling
    }

    if (res is Map<String, dynamic>) return Booking.fromJson(res);
    if (res is Map) return Booking.fromJson(Map<String, dynamic>.from(res));
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<List<Booking>> listMyBookings({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedMyBookings != null &&
        _lastMyBookingsFetchAt != null &&
        now.difference(_lastMyBookingsFetchAt!) < _cacheDuration) {
      return _cachedMyBookings!;
    }

    final res = await _api.getAny(ApiEndpoints.myBookings);
    final items = <Booking>[];
    if (res is List) {
      for (final e in res) {
        try {
          if (e is Map<String, dynamic>) {
            items.add(Booking.fromJson(e));
          } else if (e is Map) {
            items.add(Booking.fromJson(Map<String, dynamic>.from(e)));
          }
        } catch (err) {
          // Ignore
        }
      }
    }
    _cachedMyBookings = items;
    _lastMyBookingsFetchAt = now;
    return items;
  }

  Future<Booking> getBooking(String id) async {
    final res = await _api.getAny(ApiEndpoints.bookingById(id));
    if (res is Map<String, dynamic>) return Booking.fromJson(res);
    if (res is Map) return Booking.fromJson(Map<String, dynamic>.from(res));
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<Booking> updateBookingStatus(String id, String status) async {
    final res = await _api.putAny(
      '${ApiEndpoints.bookings}/$id/status',
      body: {'status': status},
    );
    if (res is Map<String, dynamic>) return Booking.fromJson(res);
    if (res is Map) return Booking.fromJson(Map<String, dynamic>.from(res));
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<Map<String, dynamic>> generateDeliveryOtp(String id) async {
    return await _api.postJson(
      '${ApiEndpoints.bookings}/$id/generate-otp',
      body: {},
    );
  }

  Future<Map<String, dynamic>> verifyDeliveryOtp(String id, String otp) async {
    return await _api.postJson(
      '${ApiEndpoints.bookings}/$id/verify-otp',
      body: {'otp': otp},
    );
  }

  Future<Booking> updateBookingDetails(
    String id,
    Map<String, dynamic> data,
  ) async {
    final res = await _api.putAny(
      '${ApiEndpoints.bookings}/$id/details',
      body: data,
    );
    if (res is Map<String, dynamic>) return Booking.fromJson(res);
    if (res is Map) return Booking.fromJson(Map<String, dynamic>.from(res));
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<Booking> batteryTireApproval(
    String id, {
    required String status,
    num? price,
    String? image,
    String? notes,
  }) async {
    final res = await _api.putAny(
      '${ApiEndpoints.bookings}/$id/battery-tire-approval',
      body: {'status': status, 'price': price, 'image': image, 'notes': notes}
        ..removeWhere((k, v) => v == null),
    );
    if (res is Map<String, dynamic>) return Booking.fromJson(res);
    if (res is Map) return Booking.fromJson(Map<String, dynamic>.from(res));
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<Booking> addWarranty(
    String id, {
    required String name,
    required num price,
    required int warrantyMonths,
    String? image,
  }) async {
    final res = await _api.putAny(
      '${ApiEndpoints.bookings}/$id/warranty',
      body: {
        'name': name,
        'price': price,
        'warrantyMonths': warrantyMonths,
        'image': image,
      }..removeWhere((k, v) => v == null),
    );
    if (res is Map<String, dynamic>) return Booking.fromJson(res);
    if (res is Map) return Booking.fromJson(Map<String, dynamic>.from(res));
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<Map<String, dynamic>> processDummyPayment(
    String bookingId, {
    Map<String, dynamic>? tempBookingData,
  }) async {
    return await _api.postJson(
      ApiEndpoints.paymentsDummyPay,
      body: {
        'bookingId': tempBookingData == null ? bookingId : null,
        'tempBookingData': tempBookingData,
      }..removeWhere((k, v) => v == null),
    );
  }
}
