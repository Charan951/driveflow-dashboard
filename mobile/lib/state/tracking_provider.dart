import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/booking.dart';
import '../core/api_client.dart';
import '../services/notification_service.dart';

class TrackingProvider extends ChangeNotifier {
  Booking? _activeBooking;
  Map<String, dynamic>? _staffLocation;
  Map<String, dynamic>? _eta;
  bool _isVisible = false;
  String? _lastStatus;
  final NotificationService _notificationService = NotificationService();

  Booking? get activeBooking => _activeBooking;
  Map<String, dynamic>? get staffLocation => _staffLocation;
  Map<String, dynamic>? get eta => _eta;
  bool get isVisible => _isVisible;

  final ApiClient _api = ApiClient();

  Future<void> init(String? role, String? userId) async {
    clear();
    if (role == null || userId == null) return;
    try {
      String endpoint = '/bookings/mybookings';
      if (role == 'merchant') {
        endpoint = '/bookings/merchant/$userId';
      }

      final data = await _api.getAny(endpoint);
      if (data is List) {
        final List<Booking> bookings = data.map((e) {
          if (e is Map) {
            final map = e is Map<String, dynamic>
                ? e
                : Map<String, dynamic>.from(e);
            return Booking.fromJson(map);
          }
          throw 'Invalid booking data';
        }).toList();
        final active = bookings.firstWhere(
          (b) => trackingStatuses.contains(b.status),
          orElse: () => throw 'No active booking',
        );
        updateActiveBooking(active);
      }
    } catch (e) {
      // No active booking found or error, silent
    }
  }

  void clear() {
    _activeBooking = null;
    _staffLocation = null;
    _eta = null;
    _isVisible = false;
    _lastStatus = null;
    _notificationService.cancelTrackingNotification();
    notifyListeners();
  }

  static const List<String> trackingStatuses = [
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

  void updateActiveBooking(Booking? booking) {
    if (booking == null) {
      _activeBooking = null;
      _isVisible = false;
      _staffLocation = null;
      _eta = null;
      _lastStatus = null;
      _notificationService.cancelTrackingNotification();
    } else if (trackingStatuses.contains(booking.status)) {
      final statusChanged = _lastStatus != booking.status;
      _activeBooking = booking;
      _isVisible = true;
      _updateLockscreenNotification(forcePop: statusChanged);
      _lastStatus = booking.status;
    } else {
      _activeBooking = null;
      _isVisible = false;
      _staffLocation = null;
      _eta = null;
      _lastStatus = null;
      _notificationService.cancelTrackingNotification();
    }
    notifyListeners();
  }

  void updateStaffLocation(Map<String, dynamic> location) {
    _staffLocation = location;
    _isVisible = true;

    _updateLockscreenNotification();
    // Throttle ETA updates could be done here if needed
    notifyListeners();
  }

  void updateEta(Map<String, dynamic> etaData) {
    _eta = etaData;
    _updateLockscreenNotification();
    notifyListeners();
  }

  void _updateLockscreenNotification({bool forcePop = false}) {
    if (_activeBooking == null || !_isVisible) return;

    final orderNum =
        _activeBooking!.orderNumber ??
        (_activeBooking!.id.length >= 6
            ? _activeBooking!.id.substring(_activeBooking!.id.length - 6)
            : _activeBooking!.id);

    String body = statusText;
    if (_eta != null) {
      final duration = _eta!['duration']?['text'] ?? '';
      final distance = _eta!['distance']?['text'] ?? '';
      if (duration.isNotEmpty) {
        body += " • Arriving in $duration ($distance)";
      }
    }

    _notificationService.showOngoingTrackingNotification(
      title: "Tracking Order #$orderNum",
      body: body,
      payload: '{"type": "status", "bookingId": "${_activeBooking!.id}"}',
      forcePop: forcePop,
    );
  }

  void dismiss() {
    _isVisible = false;
    _notificationService.cancelTrackingNotification();
    notifyListeners();
  }

  double get progress {
    if (_activeBooking == null) return 0.0;
    const statuses = [
      'ASSIGNED',
      'ACCEPTED',
      'REACHED_CUSTOMER',
      'VEHICLE_PICKED',
      'REACHED_MERCHANT',
      'VEHICLE_AT_MERCHANT',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];
    int index = statuses.indexOf(_activeBooking!.status);
    if (index == -1) return 0.0;
    return (index + 1) / statuses.length;
  }

  String get statusText {
    if (_activeBooking == null) return '';
    switch (_activeBooking!.status) {
      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'Staff is on the way';
      case 'REACHED_CUSTOMER':
        return 'Staff reached your location';
      case 'VEHICLE_PICKED':
        return 'Vehicle picked & heading to workshop';
      case 'REACHED_MERCHANT':
        return 'Staff reached workshop';
      case 'VEHICLE_AT_MERCHANT':
        return 'Vehicle is at workshop';
      case 'SERVICE_STARTED':
        return 'Service in progress';
      case 'SERVICE_COMPLETED':
        return 'Service completed';
      case 'OUT_FOR_DELIVERY':
        return 'Vehicle is out for delivery';
      default:
        return 'Order in progress';
    }
  }
}
