import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:geolocator/geolocator.dart';
import '../core/api_client.dart';
import '../core/env.dart';

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
  String? bookingId;
  service.on('set_booking').listen((event) {
    bookingId = event?['bookingId']?.toString();
  });
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
  Timer.periodic(const Duration(seconds: 10), (_) async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
      );
      final body = <String, dynamic>{'lat': pos.latitude, 'lng': pos.longitude};
      if (bookingId != null && bookingId!.isNotEmpty) {
        body['bookingId'] = bookingId;
      }
      await api.putJson(ApiEndpoints.trackingUser, body: body);
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
    if (Platform.isAndroid || Platform.isIOS) {
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
    if (Platform.isAndroid || Platform.isIOS) {
      final service = FlutterBackgroundService();
      final running = await service.isRunning();
      if (running) {
        service.invoke('stopService');
      }
    }
  }
}
