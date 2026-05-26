/// Helpers to decide when a screen should refresh from [SocketService] events.
class SocketSync {
  SocketSync._();

  static bool matches(
    String? event, {
    List<String> entities = const [],
    List<String> prefixes = const [],
    List<String> exact = const [],
  }) {
    if (event == null || event.isEmpty) return false;

    for (final value in exact) {
      if (event == value) return true;
    }
    for (final prefix in prefixes) {
      if (event.startsWith(prefix)) return true;
    }
    for (final entity in entities) {
      if (event.contains('sync:$entity')) return true;
    }
    return false;
  }

  static bool shouldRefreshBookings(String? event) => matches(
        event,
        entities: ['booking', 'approval', 'payment'],
        prefixes: [
          'booking_created',
          'booking_updated',
          'booking_cancelled',
        ],
      );

  static bool shouldRefreshVehicles(String? event) =>
      matches(event, entities: ['vehicle']);

  static bool shouldRefreshCoupons(String? event) =>
      matches(event, entities: ['coupon']);

  static bool shouldRefreshServices(String? event) =>
      matches(event, entities: ['service', 'availableServicePincode', 'slotBlock']);

  static bool shouldRefreshPayments(String? event) =>
      matches(event, entities: ['payment']);

  static bool shouldRefreshNotifications(String? event) => matches(
        event,
        entities: ['notification'],
        prefixes: ['notification'],
      );

  static bool shouldRefreshTickets(String? event) =>
      matches(event, entities: ['ticket'], prefixes: ['ticket_updated']);

  static bool shouldRefreshProfile(String? event) =>
      matches(event, entities: ['user', 'setting']);
}

/// Entity groups for [GlobalSyncRefresh].
abstract final class SyncEntities {
  static const bookings = ['booking', 'approval', 'payment'];
  static const vehicles = ['vehicle', 'booking', 'user'];
  static const coupons = ['coupon'];
  static const services = ['service', 'availableservicepincode', 'slotblock'];
  static const payments = ['payment', 'booking', 'user'];
  static const notifications = ['notification', 'user'];
  static const profile = ['user', 'setting'];
  static const tickets = ['ticket', 'user'];
  static const customerHub = [
    'booking',
    'service',
    'coupon',
    'vehicle',
    'payment',
    'notification',
    'approval',
    'setting',
  ];
}
