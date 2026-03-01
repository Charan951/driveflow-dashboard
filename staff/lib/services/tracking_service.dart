import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../core/api_client.dart';
import '../core/env.dart';
import '../core/storage.dart';
import 'background_tracking.dart';

class TrackingInfo {
  final double? lat;
  final double? lng;
  final DateTime? lastUpdate;
  final DateTime? lastServerSync;

  const TrackingInfo({
    this.lat,
    this.lng,
    this.lastUpdate,
    this.lastServerSync,
  });

  TrackingInfo copyWith({
    double? lat,
    double? lng,
    DateTime? lastUpdate,
    DateTime? lastServerSync,
  }) {
    return TrackingInfo(
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      lastUpdate: lastUpdate ?? this.lastUpdate,
      lastServerSync: lastServerSync ?? this.lastServerSync,
    );
  }
}

class StaffTrackingService {
  StaffTrackingService._internal();

  static final StaffTrackingService instance = StaffTrackingService._internal();

  static const double autoStatusDistanceMeters = 100;

  final ApiClient _api = ApiClient();
  final ValueNotifier<TrackingInfo> info = ValueNotifier<TrackingInfo>(
    const TrackingInfo(),
  );

  io.Socket? _socket;
  StreamSubscription<Position>? _positionSub;
  bool _isTracking = false;
  String? _activeBookingId;
  int _lastSocketMs = 0;
  int _lastRestMs = 0;
  double? _targetLat;
  double? _targetLng;
  String? _targetForStatus;

  Timer? _heartbeatTimer;

  bool get isTracking => _isTracking;

  String? get activeBookingId => _activeBookingId;

  Future<void> setActiveBookingId(String? id) async {
    _activeBookingId = id;
  }

  void setAutoStatusTarget({
    required double? lat,
    required double? lng,
    required String? status,
  }) {
    _targetLat = lat;
    _targetLng = lng;
    _targetForStatus = status;
  }

  Future<void> start() async {
    if (_isTracking) {
      // Re-assert online status even if already tracking
      _updateOnlineStatus(true);
      return;
    }
    _isTracking = true;

    // Immediate online status update without waiting for everything else
    _updateOnlineStatus(true);

    final hasPermission = await _ensurePermissions();
    if (!hasPermission) {
      _isTracking = false;
      _updateOnlineStatus(false);
      return;
    }

    await _ensureSocket();
    await _startPositionStream();

    // Trigger an immediate position update and server sync
    _triggerImmediateSync();

    await BackgroundTracking.start(bookingId: _activeBookingId);

    // Start periodic heartbeat (every 1 minute instead of 2 for better responsiveness)
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (_isTracking) {
        _updateOnlineStatus(true);
      }
    });
  }

  Future<void> _triggerImmediateSync() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      await _handlePosition(position);
    } catch (e) {
      debugPrint('TrackingService: Failed to trigger immediate sync: $e');
    }
  }

  Future<void> stop() async {
    _isTracking = false;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    await _positionSub?.cancel();
    _positionSub = null;
    await BackgroundTracking.stop();
    await _updateOnlineStatus(false);
  }

  Future<void> _updateOnlineStatus(bool isOnline) async {
    try {
      debugPrint('TrackingService: Updating online status to $isOnline');
      final response = await _api.putAny(
        ApiEndpoints.usersOnlineStatus,
        body: {'isOnline': isOnline},
      );
      debugPrint('TrackingService: Status updated successfully: $response');
    } catch (e) {
      debugPrint('TrackingService: Failed to update online status: $e');
    }
  }

  Future<bool> _ensurePermissions() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return false;
    }
    if (permission == LocationPermission.whileInUse) {
      if (Platform.isIOS) {
        final next = await Geolocator.requestPermission();
        if (next == LocationPermission.always) {
          permission = next;
        }
      }
    }
    return true;
  }

  Future<void> _ensureSocket() async {
    final token = await AppStorage().getToken();
    final next = io.io(
      Env.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableForceNew()
          .setAuth(token != null && token.isNotEmpty ? {'token': token} : {})
          .build(),
    );
    _socket?.dispose();
    _socket = next;
    next.connect();
  }

  Future<void> _startPositionStream() async {
    await _positionSub?.cancel();
    final settings = const LocationSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 0,
    );
    _positionSub = Geolocator.getPositionStream(
      locationSettings: settings,
    ).listen(_handlePosition, onError: (_) {});
  }

  Future<void> _handlePosition(Position position) async {
    if (!_isTracking) return;
    final now = DateTime.now();
    final nowMs = now.millisecondsSinceEpoch;
    final current = info.value;
    info.value = current.copyWith(
      lat: position.latitude,
      lng: position.longitude,
      lastUpdate: now,
    );

    if (_targetLat != null &&
        _targetLng != null &&
        _targetForStatus != null &&
        _activeBookingId != null) {
      final distance = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        _targetLat!,
        _targetLng!,
      );
      if (distance < autoStatusDistanceMeters) {
        try {
          await _api.putJson(
            ApiEndpoints.bookingStatus(_activeBookingId!),
            body: {'status': _targetForStatus},
          );
          _targetLat = null;
          _targetLng = null;
          _targetForStatus = null;
        } catch (_) {}
      }
    }

    final socket = _socket;
    // Live tracking via socket - every 10 seconds for real-time accuracy
    if (socket != null && nowMs - _lastSocketMs > 10000) {
      final payload = <String, dynamic>{
        'lat': position.latitude,
        'lng': position.longitude,
        'timestamp': now.toIso8601String(),
      };
      final bookingId = _activeBookingId;
      if (bookingId != null && bookingId.isNotEmpty) {
        payload['bookingId'] = bookingId;
      }
      try {
        socket.emit('location', payload);
        _lastSocketMs = nowMs;
      } catch (_) {}
    }

    // Persistent update via REST - every 1 minute as requested
    if (nowMs - _lastRestMs > 60000) {
      final body = <String, dynamic>{
        'lat': position.latitude,
        'lng': position.longitude,
      };
      final bookingId = _activeBookingId;
      if (bookingId != null && bookingId.isNotEmpty) {
        body['bookingId'] = bookingId;
      }
      try {
        await _api.putJson(ApiEndpoints.trackingUser, body: body);
        final updated = info.value.copyWith(lastServerSync: DateTime.now());
        info.value = updated;
        _lastRestMs = nowMs;
      } catch (_) {}
    }
  }
}
