import '../core/api_client.dart';
import '../core/env.dart';
import '../models/booking.dart';

class CarWashService {
  final ApiClient _api = ApiClient();

  // Get all car wash bookings (staff sees only their assigned ones)
  Future<List<Booking>> getCarWashBookings() async {
    final res = await _api.getAny('${ApiEndpoints.bookings}/carwash');
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
    return items;
  }

  // Upload before wash photos
  Future<Map<String, dynamic>> uploadBeforePhotos(String bookingId, List<String> photos) async {
    return await _api.putAny(
      '${ApiEndpoints.bookings}/$bookingId/carwash/before-photos',
      body: {'photos': photos},
    );
  }

  // Upload after wash photos
  Future<Map<String, dynamic>> uploadAfterPhotos(String bookingId, List<String> photos) async {
    return await _api.putAny(
      '${ApiEndpoints.bookings}/$bookingId/carwash/after-photos',
      body: {'photos': photos},
    );
  }

  // Start car wash
  Future<Map<String, dynamic>> startCarWash(String bookingId) async {
    return await _api.putAny('${ApiEndpoints.bookings}/$bookingId/carwash/start');
  }

  // Complete car wash
  Future<Map<String, dynamic>> completeCarWash(String bookingId) async {
    return await _api.putAny('${ApiEndpoints.bookings}/$bookingId/carwash/complete');
  }
}
