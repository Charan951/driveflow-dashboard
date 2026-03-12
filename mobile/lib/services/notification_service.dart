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

    // 1. Initialize Local Notifications
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

    // 2. Create Android Notification Channels
    await PlatformUtils.createAndroidNotificationChannels(_localNotifications);

    // 3. Set up FCM listeners
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

    // 4. Token Management (Listeners only, actual sync happens in syncToken)
    _setupTokenListeners();

    _initialized = true;
  }

  Future<void> requestPermissions() async {
    if (kIsWeb) return;
    await PlatformUtils.requestMobilePermissions(_messaging);
  }

  void _setupTokenListeners() {
    if (kIsWeb) return;

    // Listen for token refresh
    _messaging.onTokenRefresh.listen((newToken) {
      syncToken();
    });
  }

  Future<void> syncToken() async {
    if (kIsWeb) return;
    try {
      final token = await _messaging.getToken();
      if (token == null) return;

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
    String? imageUrl =
        message.data['image'] ??
        notification?.android?.imageUrl ??
        notification?.apple?.imageUrl;

    if (notification != null) {
      BigPictureStyleInformation? bigPictureStyleInformation;
      if (imageUrl != null && imageUrl.isNotEmpty) {
        // TODO: Download image and save locally for offline display
        bigPictureStyleInformation = BigPictureStyleInformation(
          FilePathAndroidBitmap(imageUrl),
          largeIcon: FilePathAndroidBitmap(imageUrl),
        );
      }

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
            visibility: NotificationVisibility.public,
            styleInformation: bigPictureStyleInformation,
            largeIcon: imageUrl != null
                ? const DrawableResourceAndroidBitmap('@mipmap/ic_launcher')
                : null,
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
            interruptionLevel: InterruptionLevel.active,
          ),
        ),
        payload: jsonEncode(message.data),
      );
    }
  }

  Future<void> showLocalNotification({
    required String title,
    required String body,
    String? imageUrl,
    String? payload,
  }) async {
    if (kIsWeb) return;

    BigPictureStyleInformation? bigPictureStyleInformation;
    if (imageUrl != null && imageUrl.isNotEmpty) {
      bigPictureStyleInformation = BigPictureStyleInformation(
        FilePathAndroidBitmap(imageUrl),
        largeIcon: FilePathAndroidBitmap(imageUrl),
      );
    }

    final AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'high_importance_channel',
          'High Importance Notifications',
          channelDescription:
              'This channel is used for important notifications.',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
          playSound: true,
          icon: '@mipmap/ic_launcher',
          styleInformation: bigPictureStyleInformation,
          largeIcon: imageUrl != null
              ? const DrawableResourceAndroidBitmap('@mipmap/ic_launcher')
              : null,
        );

    final NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentSound: true,
        presentBadge: true,
      ),
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
        final String? subType = data['subType']?.toString();

        if ((type == 'status' || actionId == 'track_live_action') &&
            bookingId != null &&
            bookingId.isNotEmpty) {
          // Navigate directly to live tracking map
          Navigator.pushNamed(context, '/track', arguments: bookingId);
        } else if (type == 'booking_update' || type == 'status') {
          if (bookingId != null && bookingId.isNotEmpty) {
            Navigator.pushNamed(context, '/track', arguments: bookingId);
          } else {
            Navigator.pushNamed(context, '/bookings');
          }
        } else if (type == 'payment' || subType == 'billing') {
          Navigator.pushNamed(context, '/payments');
        } else if (type == 'support') {
          Navigator.pushNamed(context, '/support');
        } else if (type == 'promotion') {
          Navigator.pushNamed(context, '/speshway-dashboard');
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
