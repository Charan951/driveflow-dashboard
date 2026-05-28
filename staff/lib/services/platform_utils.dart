import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

class PlatformUtils {
  static String get deviceType => Platform.isAndroid ? 'android' : 'ios';

  static Future<void> createAndroidNotificationChannels(
    FlutterLocalNotificationsPlugin localNotifications,
  ) async {
    if (Platform.isAndroid) {
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'staff_notifications',
        'Staff Notifications',
        description: 'Notifications for staff assignments and updates',
        importance: Importance.max,
      );

      await localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(channel);
    }
  }

  static Future<void> requestMobilePermissions(
    FirebaseMessaging messaging,
  ) async {
    if (Platform.isAndroid) {
      final status = await Permission.notification.status;
      if (!status.isGranted) {
        await Permission.notification.request();
      }
    } else if (Platform.isIOS) {
      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
    }
  }
}
