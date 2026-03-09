import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class PlatformUtils {
  static String get deviceType => 'web';

  static Future<void> createAndroidNotificationChannels(
    FlutterLocalNotificationsPlugin localNotifications,
  ) async {
    // No-op on web
  }

  static Future<void> requestMobilePermissions(
    FirebaseMessaging messaging,
  ) async {
    // No-op on web
  }
}
