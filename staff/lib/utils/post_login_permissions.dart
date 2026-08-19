import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../services/notification_service.dart';

/// OS permission prompts that must not appear on splash, onboarding, or login.
class PostLoginPermissions {
  static bool _requestedThisSession = false;

  static Future<void> request() async {
    if (_requestedThisSession) return;
    _requestedThisSession = true;
    await NotificationService().requestPermissions();
    await _requestLocation();
  }

  static Future<void> _requestLocation() async {
    if (kIsWeb) return;
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse) {
        return;
      }
      if (permission == LocationPermission.deniedForever) return;
      await Geolocator.requestPermission();
    } catch (e) {
      debugPrint('Location permission after login skipped: $e');
    }
  }
}
