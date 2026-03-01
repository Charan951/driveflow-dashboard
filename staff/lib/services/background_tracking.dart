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
  service.on('stopService').listen((event) {
    service.stopSelf();
  });

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

  Future<bool> ensurePerms() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return false;
    var p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) {
      p = await Geolocator.requestPermission();
    }
    return p != LocationPermission.denied &&
        p != LocationPermission.deniedForever;
  }

  if (!await ensurePerms()) return;

  Timer.periodic(const Duration(minutes: 1), (_) async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );

      final payload = <String, dynamic>{
        'lat': pos.latitude,
        'lng': pos.longitude,
        'timestamp': DateTime.now().toIso8601String(),
      };

      if (bookingId != null && bookingId!.isNotEmpty) {
        payload['bookingId'] = bookingId;
      }

      // 1. Update via REST API
      await api.putJson(
        ApiEndpoints.trackingUser,
        body: {
          'lat': pos.latitude,
          'lng': pos.longitude,
          'bookingId': bookingId,
        },
      );

      // 2. Update via Socket for real-time visibility
      if (socket != null && socket!.connected) {
        socket!.emit('location', payload);
      } else if (socket != null && !socket!.connected) {
        socket!.connect();
      }
    } catch (_) {}
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
