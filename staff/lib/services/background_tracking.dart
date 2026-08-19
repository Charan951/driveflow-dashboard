import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/api_client.dart';
import '../core/env.dart';
import '../core/storage.dart';

@pragma('vm:entry-point')
Future<void> _onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  final storage = AppStorage();
  final token = await storage.getToken();
  if (token == null || token.isEmpty) {
    await service.stopSelf();
    return;
  }

  final api = ApiClient();
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
  final locationSettings = Platform.isAndroid
      ? AndroidSettings(
          accuracy: LocationAccuracy.best,
          distanceFilter: 0,
          intervalDuration: const Duration(
            seconds: 3,
          ), // Match StaffTrackingService (3s)
        )
      : Platform.isIOS || Platform.isMacOS
      ? AppleSettings(
          accuracy: LocationAccuracy.best,
          distanceFilter: 0,
          pauseLocationUpdatesAutomatically: false,
          showBackgroundLocationIndicator: true,
        )
      : const LocationSettings(
          accuracy: LocationAccuracy.best,
          distanceFilter: 0,
        );

  Geolocator.getPositionStream(locationSettings: locationSettings).listen((
    Position pos,
  ) async {
    final now = DateTime.now();
    final nowMs = now.millisecondsSinceEpoch;

    final payload = <String, dynamic>{
      'lat': pos.latitude,
      'lng': pos.longitude,
      'timestamp': now.toIso8601String(),
    };

    debugPrint(
      'BackgroundTracking: Position update: ${pos.latitude}, ${pos.longitude} (Accuracy: ${pos.accuracy}m)',
    );

    if (bookingId != null && bookingId!.isNotEmpty) {
      payload['bookingId'] = bookingId;
    }

    // 1. Live update via Socket (Throttle to 1 second for real-time responsiveness)
    if (nowMs - lastSocketMs > 1000) {
      if (socket != null) {
        if (socket!.connected) {
          socket!.emit('location', payload);
          lastSocketMs = nowMs;
        } else {
          debugPrint(
            'BackgroundTracking: Socket not connected, attempting to reconnect',
          );
          socket!.connect();
        }
      }
    }

    // 2. Persistent update via REST (Throttle to 1 second as a fallback)
    if (nowMs - lastRestMs > 1000) {
      final latestToken = await storage.getToken();
      if (latestToken == null || latestToken.isEmpty) {
        await service.stopSelf();
        return;
      }
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
      } catch (e) {
        debugPrint('BackgroundTracking: REST update error: $e');
      }
    }
  });

  // Keep the service alive with a periodic heartbeat if the stream is idle
  Timer.periodic(const Duration(minutes: 1), (_) async {
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
  static const String _notificationChannelId = 'carzzi_staff_tracking';
  static const MethodChannel _nativeStop = MethodChannel(
    'com.carzzi.staff/bg_tracking',
  );

  static Future<void> configure() async {
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) return;
    if (Platform.isAndroid) {
      await _ensureAndroidNotificationChannel();
    }
    await FlutterBackgroundService().configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        // Required for location updates to keep flowing once the app is
        // backgrounded (e.g. staff switches to Google Maps for turn-by-turn
        // navigation) — without a real foreground service, Android
        // suspends/kills background isolates within seconds on most OEMs.
        isForegroundMode: true,
        autoStart: false,
        notificationChannelId: _notificationChannelId,
        initialNotificationTitle: 'Carzzi Staff — Tracking active',
        initialNotificationContent:
            'Sharing your live location for the current job.',
        foregroundServiceNotificationId: 9001,
        foregroundServiceTypes: const [AndroidForegroundType.location],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: _onStart,
        onBackground: _onIosBackground,
      ),
    );
    await stop();
  }

  static Future<void> _ensureAndroidNotificationChannel() async {
    const channel = AndroidNotificationChannel(
      _notificationChannelId,
      'Live tracking',
      description: 'Shown while sharing your location for an active job.',
      importance: Importance.low,
    );
    await FlutterLocalNotificationsPlugin()
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);
  }

  static Future<bool> _canStartAndroidForegroundService() async {
    if (!Platform.isAndroid) return true;
    var status = await Permission.notification.status;
    if (!status.isGranted) {
      status = await Permission.notification.request();
    }
    if (!status.isGranted) {
      debugPrint(
        'BackgroundTracking: skipping foreground service (notifications not granted)',
      );
      return false;
    }
    await _ensureAndroidNotificationChannel();
    return true;
  }

  static Future<void> start({String? bookingId}) async {
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) return;
    try {
      if (Platform.isAndroid && !await _canStartAndroidForegroundService()) {
        return;
      }
      final service = FlutterBackgroundService();
      final running = await service.isRunning();
      if (!running) {
        await service.startService();
      }
      if (bookingId != null && bookingId.isNotEmpty) {
        service.invoke('set_booking', {'bookingId': bookingId});
      }
    } catch (e) {
      debugPrint('BackgroundTracking: failed to start service: $e');
    }
  }

  static Future<void> stop() async {
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) return;
    try {
      FlutterBackgroundService().invoke('stopService');
    } catch (_) {}
    try {
      await _nativeStop.invokeMethod('forceStop');
    } catch (e) {
      debugPrint('BackgroundTracking: failed to stop service: $e');
    }
  }
}
