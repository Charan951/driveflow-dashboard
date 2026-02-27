import '../core/api_client.dart';
import '../core/env.dart';
import '../models/booking.dart';

class BookingService {
  final ApiClient _api = ApiClient();

  static List<Booking>? _cachedMyBookings;
  static DateTime? _lastMyBookingsFetchAt;
  static const Duration _cacheDuration = Duration(minutes: 2);

  Future<Booking> createBooking({
    required String vehicleId,
    required List<String> serviceIds,
    required DateTime date,
    String? notes,
    BookingLocation? location,
    bool pickupRequired = false,
  }) async {
    final res = await _api.postAny(
      ApiEndpoints.bookings,
      body: {
        'vehicleId': vehicleId,
        'serviceIds': serviceIds,
        'date': date.toIso8601String(),
        if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        if (location != null) 'location': location.toJson(),
        'pickupRequired': pickupRequired,
      },
    );
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
        if (e is Map<String, dynamic>) {
          items.add(Booking.fromJson(e));
        } else if (e is Map) {
          items.add(Booking.fromJson(Map<String, dynamic>.from(e)));
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

  Future<Map<String, dynamic>> createRazorpayOrder(String bookingId) async {
    return await _api.postJson(
      ApiEndpoints.paymentsCreateOrder,
      body: {'bookingId': bookingId},
    );
  }

  Future<Map<String, dynamic>> verifyPayment({
    required String bookingId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    return await _api.postJson(
      ApiEndpoints.paymentsVerifyPayment,
      body: {
        'razorpay_order_id': razorpayOrderId,
        'razorpay_payment_id': razorpayPaymentId,
        'razorpay_signature': razorpaySignature,
        'bookingId': bookingId,
      },
    );
  }
}
