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
      const AndroidNotificationChannel highImportanceChannel =
          AndroidNotificationChannel(
            'high_importance_channel',
            'High Importance Notifications',
            description: 'This channel is used for important notifications.',
            importance: Importance.max,
            playSound: true,
          );

      const AndroidNotificationChannel trackingChannel =
          AndroidNotificationChannel(
            'tracking_channel',
            'Live Tracking',
            description: 'Used for live tracking updates on lockscreen.',
            importance: Importance.high,
            playSound: false,
            showBadge: false,
          );

      const AndroidNotificationChannel merchantApprovalChannel =
          AndroidNotificationChannel(
            'merchant_approval_channel',
            'Merchant Approvals',
            description:
                'Part and cost approvals from your merchant with quick actions.',
            importance: Importance.max,
            playSound: true,
          );

      const AndroidNotificationChannel paymentPendingChannel =
          AndroidNotificationChannel(
            'payment_pending_channel',
            'Payment due',
            description:
                'Alerts when service is complete and payment is pending.',
            importance: Importance.max,
            playSound: true,
          );

      final plugin = localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();

      if (plugin != null) {
        await plugin.createNotificationChannel(highImportanceChannel);
        await plugin.createNotificationChannel(trackingChannel);
        await plugin.createNotificationChannel(merchantApprovalChannel);
        await plugin.createNotificationChannel(paymentPendingChannel);
      }
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
