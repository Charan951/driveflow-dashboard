import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/api_client.dart';
import '../core/env.dart';
import '../core/storage.dart';

@pragma('vm:entry-point')
Future<void> _onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  if (service is AndroidServiceInstance) {
    service.on('setAsForeground').listen((event) {
      service.setAsForegroundService();
    });
    service.on('setAsBackground').listen((event) {
      service.setAsBackgroundService();
    });
  }

  final api = ApiClient();
  final storage = AppStorage();
  String? bookingId;
  io.Socket? socket;

  service.on('set_booking').listen((event) {
    bookingId = event?['bookingId']?.toString();
  });

  Future<void> initSocket() async {
    final token = await storage.getToken();
    socket = io.io(
      Env.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableForceNew()
          .setAuth(token != null ? {'token': token} : {})
          .build(),
    );
    socket?.connect();
  }

  await initSocket();

  Future<void> updateOnlineStatus(bool isOnline) async {
    try {
      debugPrint('BackgroundTracking: Updating online status to $isOnline');
      await api.putAny(
        ApiEndpoints.usersOnlineStatus,
        body: {'isOnline': isOnline},
      );
      debugPrint('BackgroundTracking: Status updated successfully');
    } catch (e) {
      debugPrint('BackgroundTracking: Failed to update online status: $e');
    }
  }

  await updateOnlineStatus(true);

  service.on('stopService').listen((event) async {
    await updateOnlineStatus(false);
    service.stopSelf();
  });

  // Keep track of last sync times to avoid flooding the backend
  int lastSocketMs = 0;
  int lastRestMs = 0;

  // Listen to position updates for continuous tracking
  Geolocator.getPositionStream(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 0, // Update for every meter
    ),
  ).listen((Position pos) async {
    final now = DateTime.now();
    final nowMs = now.millisecondsSinceEpoch;

    // Update notification content to show active tracking
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        service.setAsForegroundService();
        service.setForegroundNotificationInfo(
          title: "Staff Tracking Active",
          content: "Continuous background tracking enabled.",
        );
      }
    }

    final payload = <String, dynamic>{
      'lat': pos.latitude,
      'lng': pos.longitude,
      'timestamp': now.toIso8601String(),
    };

    if (bookingId != null && bookingId!.isNotEmpty) {
      payload['bookingId'] = bookingId;
    }

    // 1. Live update via Socket (Throttle to 10 seconds for real-time responsiveness)
    if (nowMs - lastSocketMs > 10000) {
      if (socket != null) {
        if (socket!.connected) {
          socket!.emit('location', payload);
          lastSocketMs = nowMs;
        } else {
          socket!.connect();
        }
      }
    }

    // 2. Persistent update via REST (Throttle to 1 minute to save battery/bandwidth)
    if (nowMs - lastRestMs > 60000) {
      try {
        await api.putJson(
          ApiEndpoints.trackingUser,
          body: {
            'lat': pos.latitude,
            'lng': pos.longitude,
            'bookingId': bookingId,
          },
        );
        lastRestMs = nowMs;
        // Also re-assert online status as part of REST sync
        await updateOnlineStatus(true);
      } catch (_) {}
    }
  });

  // Keep the service alive with a periodic heartbeat if the stream is idle
  Timer.periodic(const Duration(minutes: 5), (_) async {
    if (socket != null && !socket!.connected) {
      socket!.connect();
    }
    await updateOnlineStatus(true);
  });
}

@pragma('vm:entry-point')
Future<bool> _onIosBackground(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  return true;
}

class BackgroundTracking {
  static Future<void> configure() async {
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) return;
    await FlutterBackgroundService().configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        isForegroundMode: true,
        autoStart: false,
        foregroundServiceNotificationId: 888,
        foregroundServiceTypes: [AndroidForegroundType.location],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: _onStart,
        onBackground: _onIosBackground,
      ),
    );
  }

  static Future<void> start({String? bookingId}) async {
    if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
      final service = FlutterBackgroundService();
      final running = await service.isRunning();
      if (!running) {
        await service.startService();
      }
      if (bookingId != null && bookingId.isNotEmpty) {
        service.invoke('set_booking', {'bookingId': bookingId});
      }
    }
  }

  static Future<void> stop() async {
    if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
      final service = FlutterBackgroundService();
      final running = await service.isRunning();
      if (running) {
        service.invoke('stopService');
      }
    }
  }
}
