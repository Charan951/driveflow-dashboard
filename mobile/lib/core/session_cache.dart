import 'storage.dart';
import '../services/booking_service.dart';
import '../services/catalog_service.dart';
import '../services/vehicle_service.dart';

/// Clears cached data that must not leak between user sessions.
class SessionCache {
  SessionCache._();

  static Future<void> clearForNewSession() async {
    await AppStorage().clearDashboard();
    await AppStorage().clearHasSeenNoVehicleModal();
    VehicleService().clearCache();
    BookingService.clearSessionCache();
    CatalogService().clearCache();
  }
}
