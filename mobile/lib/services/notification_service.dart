import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../firebase_options.dart';

// Import PlatformUtils only for non-web
import './platform_utils.dart'
    if (dart.library.html) './platform_utils_web.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../core/api_client.dart';
import '../main.dart'; // Import to use rootNavigatorKey

// Background message handler
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

@pragma('vm:entry-point')
void _onDidReceiveBackgroundNotificationResponse(
  NotificationResponse response,
) {
  try {
    NotificationService()._handleNotificationClick(
      response.payload,
      actionId: response.actionId,
    );
  } catch (_) {}
}

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      message: (json['body'] ?? json['message'] ?? '').toString(),
      type: (json['type'] ?? 'info').toString(),
      isRead: json['isRead'] == true,
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final ApiClient _api = ApiClient();
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  Future<void> initialize() async {
    if (kIsWeb) {
      _initialized = true;
      return;
    }
    if (_initialized) return;

    // 1. Request permissions
    await requestPermissions();

    // 2. Initialize Local Notifications
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        );

    const InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsIOS,
        );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        _handleNotificationClick(response.payload, actionId: response.actionId);
      },
      onDidReceiveBackgroundNotificationResponse:
          _onDidReceiveBackgroundNotificationResponse,
    );

    // 3. Create Android Notification Channels
    if (!kIsWeb) {
      await PlatformUtils.createAndroidNotificationChannels(
        _localNotifications,
      );
    }

    // 4. Set up FCM listeners
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );

    // Foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      _showLocalNotification(message);
    });

    // Background/Terminated state message click
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationClick(jsonEncode(message.data));
    });

    // Handle initial message if app was terminated
    RemoteMessage? initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationClick(jsonEncode(initialMessage.data));
    }

    // 5. Token Management
    _setupTokenManagement();

    _initialized = true;
  }

  Future<void> requestPermissions() async {
    if (kIsWeb) return;
    await PlatformUtils.requestMobilePermissions(_messaging);
  }

  void _setupTokenManagement() {
    if (kIsWeb) return;
    // Get initial token
    _messaging.getToken().then((token) {
      if (token != null) _saveTokenToBackend(token);
    });

    // Listen for token refresh
    _messaging.onTokenRefresh.listen((newToken) {
      _saveTokenToBackend(newToken);
    });
  }

  Future<void> _saveTokenToBackend(String token) async {
    try {
      String deviceType = PlatformUtils.deviceType;
      await _api.postAny(
        '/users/fcm-token',
        body: {'token': token, 'deviceType': deviceType},
      );

      // Subscribe to topics
      await _messaging.subscribeToTopic('all_users');
      await _messaging.subscribeToTopic('customers');
    } catch (e) {
      // Ignore
    }
  }

  void _showLocalNotification(RemoteMessage message) async {
    if (kIsWeb) return;
    RemoteNotification? notification = message.notification;

    if (notification != null) {
      await _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'high_importance_channel',
            'High Importance Notifications',
            channelDescription:
                'This channel is used for important notifications.',
            importance: Importance.max,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        payload: jsonEncode(message.data),
      );
    }
  }

  Future<void> showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (kIsWeb) return;
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'high_importance_channel',
          'High Importance Notifications',
          channelDescription:
              'This channel is used for important notifications.',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
          playSound: true,
        );

    const NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
      iOS: DarwinNotificationDetails(presentAlert: true, presentSound: true),
    );

    await _localNotifications.show(
      (DateTime.now().millisecondsSinceEpoch % 100000).toInt(),
      title,
      body,
      platformChannelSpecifics,
      payload: payload,
    );
  }

  // Live Tracking Persistent Notification (For Lockscreen/Ongoing)
  Future<void> showOngoingTrackingNotification({
    required String title,
    required String body,
    String? payload,
    bool forcePop = false,
  }) async {
    if (kIsWeb) return;
    const int trackingNotificationId = 888;

    final AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'tracking_channel',
          'Live Tracking',
          channelDescription: 'Used for live tracking updates on lockscreen.',
          importance: Importance.max,
          priority: Priority.high,
          ongoing: true, // Keep it on lockscreen/notification panel
          autoCancel: false,
          showWhen: false,
          icon: '@mipmap/ic_launcher',
          onlyAlertOnce: !forcePop,
          category: AndroidNotificationCategory.status,
          visibility: NotificationVisibility.public,
          actions: <AndroidNotificationAction>[
            AndroidNotificationAction(
              'track_live_action',
              'View Map',
              showsUserInterface: true,
              cancelNotification: false,
            ),
          ],
        );

    final NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentSound: forcePop,
        interruptionLevel: forcePop
            ? InterruptionLevel.active
            : InterruptionLevel.passive,
      ),
    );

    await _localNotifications.show(
      trackingNotificationId,
      title,
      body,
      platformChannelSpecifics,
      payload: payload,
    );
  }

  Future<void> cancelTrackingNotification() async {
    if (kIsWeb) return;
    await _localNotifications.cancel(888);
  }

  Future<void> _handleNotificationClick(
    String? payload, {
    String? actionId,
  }) async {
    if (payload == null) return;
    try {
      Map<String, dynamic> data = jsonDecode(payload);

      // Use the rootNavigatorKey from main.dart to navigate
      final context = rootNavigatorKey.currentContext;
      if (context != null) {
        final String? bookingId = data['bookingId']?.toString();
        final String? type = data['type']?.toString();

        if ((type == 'status' || actionId == 'track_live_action') &&
            bookingId != null &&
            bookingId.isNotEmpty) {
          // Navigate directly to live tracking map
          Navigator.pushNamed(context, '/track', arguments: bookingId);
        } else if (type == 'status' ||
            type == 'assignment_update' ||
            type == 'billing_update') {
          Navigator.pushNamed(context, '/bookings');
        } else {
          Navigator.pushNamed(context, '/notifications');
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // --- Backend Sync Methods ---

  Future<List<NotificationItem>> listMyNotifications() async {
    final data = await _api.getAny('/notifications/my');
    if (data is List) {
      return data
          .map(
            (e) => NotificationItem.fromJson(
              e is Map<String, dynamic>
                  ? e
                  : Map<String, dynamic>.from(e as Map),
            ),
          )
          .toList();
    }
    return [];
  }

  Future<void> markAsRead(String id) async {
    if (id.isEmpty) return;
    await _api.putAny('/notifications/$id/read');
  }

  Future<void> clearAll() async {
    await _api.deleteAny('/notifications/my');
  }
}
