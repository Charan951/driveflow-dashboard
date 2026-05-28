import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import '../firebase_options.dart';

// Import PlatformUtils only for non-web
import './platform_utils.dart'
    if (dart.library.html) './platform_utils_web.dart';
import '../core/api_client.dart';
import '../main.dart'; // Import to use rootNavigatorKey

// Background message handler
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  }
  debugPrint("Handling a background message: ${message.messageId}");
}

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;
  final String? bookingId;
  final String? orderId;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.bookingId,
    this.orderId,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    final nestedData = json['data'];
    final Map<String, dynamic> dataMap = nestedData is Map<String, dynamic>
        ? nestedData
        : (nestedData is Map
              ? Map<String, dynamic>.from(nestedData)
              : <String, dynamic>{});
    final bookingId = (json['bookingId'] ?? dataMap['bookingId'])?.toString();
    final orderId = (json['orderId'] ?? dataMap['orderId'] ?? bookingId)
        ?.toString();
    return NotificationItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      message: (json['body'] ?? json['message'] ?? '').toString(),
      type: (json['type'] ?? 'info').toString(),
      isRead: json['isRead'] == true,
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      bookingId: bookingId,
      orderId: orderId,
    );
  }
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final ApiClient _api = ApiClient();
  FirebaseMessaging get _messaging => FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  Future<void> _ensureFirebaseReady() async {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }
  }

  Future<void> initialize() async {
    if (kIsWeb) {
      _initialized = true;
      return;
    }
    if (_initialized) return;
    await _ensureFirebaseReady();

    // Set up FCM listeners
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );

    // Initialize local notifications for foreground display
    await _initLocalNotifications();

    // Foreground message listener - show local notification
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Got a message whilst in the foreground!');
      debugPrint('Message data: ${message.data}');

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

    // Token Management (Listeners only, actual sync happens in syncToken)
    _setupTokenListeners();

    _initialized = true;
  }

  Future<void> _initLocalNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings();

    const InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsIOS,
        );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.payload != null) {
          _handleNotificationClick(response.payload!);
        }
      },
    );

    // Create notification channel for Android
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'staff_notifications',
      'Staff Notifications',
      description: 'Notifications for staff assignments and updates',
      importance: Importance.max,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    RemoteNotification? notification = message.notification;

    if (notification != null) {
      final String? imageUrl =
          notification.android?.imageUrl ?? notification.apple?.imageUrl;
      AndroidBitmap<Object>? largeIcon;

      if (imageUrl != null && imageUrl.isNotEmpty) {
        try {
          final http.Response response = await http.get(Uri.parse(imageUrl));
          if (response.statusCode == 200) {
            largeIcon = ByteArrayAndroidBitmap(response.bodyBytes);
          }
        } catch (e) {
          debugPrint('Error loading notification image: $e');
        }
      }

      final AndroidNotificationDetails androidPlatformChannelSpecifics =
          AndroidNotificationDetails(
            'staff_notifications',
            'Staff Notifications',
            channelDescription:
                'Notifications for staff assignments and updates',
            importance: Importance.max,
            priority: Priority.high,
            showWhen: true,
            largeIcon:
                largeIcon ??
                const DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
          );

      const DarwinNotificationDetails iOSPlatformChannelSpecifics =
          DarwinNotificationDetails();

      final NotificationDetails platformChannelSpecifics = NotificationDetails(
        android: androidPlatformChannelSpecifics,
        iOS: iOSPlatformChannelSpecifics,
      );

      await _localNotifications.show(
        DateTime.now().millisecond,
        notification.title,
        notification.body,
        platformChannelSpecifics,
        payload: jsonEncode(message.data),
      );
    }
  }

  Future<void> requestPermissions() async {
    if (kIsWeb) return;
    await _ensureFirebaseReady();
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
      await _ensureFirebaseReady();
      final token = await _messaging.getToken();
      if (token == null) return;

      String deviceType = PlatformUtils.deviceType;
      await _api.postAny(
        '/users/fcm-token',
        body: {'token': token, 'deviceType': deviceType},
      );

      // Subscribe to topics
      await _messaging.subscribeToTopic('all_users');
      await _messaging.subscribeToTopic('staff');
    } catch (e) {
      // Ignore
    }
  }

  Future<void> _handleNotificationClick(String? payload) async {
    if (payload == null) return;
    try {
      Map<String, dynamic> data = jsonDecode(payload);

      // Use the rootNavigatorKey from main.dart to navigate
      final context = rootNavigatorKey.currentContext;
      if (context != null) {
        final String? bookingId = data['bookingId']?.toString();
        final String? orderId = data['orderId']?.toString() ?? bookingId;
        final String? type = data['type']?.toString();

        // Staff-specific notification types
        if (type == 'assignment' || type == 'staff_assigned') {
          // Admin assigned booking to staff
          if (orderId != null) {
            Navigator.pushNamed(context, '/order', arguments: orderId);
          } else {
            Navigator.pushNamed(context, '/home');
          }
        } else if (type == 'service_completed' ||
            type == 'merchant_service_complete') {
          // Merchant completed service - staff should pick up vehicle
          if (orderId != null) {
            Navigator.pushNamed(context, '/order', arguments: orderId);
          } else {
            Navigator.pushNamed(context, '/home');
          }
        } else if (type == 'new_order' || type == 'status_update') {
          if (orderId != null) {
            Navigator.pushNamed(context, '/order', arguments: orderId);
          } else {
            Navigator.pushNamed(context, '/home');
          }
        } else if (type == 'merchant_update') {
          Navigator.pushNamed(context, '/merchant-orders');
        } else {
          // Default navigation for other notifications
          if (orderId != null) {
            Navigator.pushNamed(context, '/order', arguments: orderId);
          } else {
            Navigator.pushNamed(context, '/home');
          }
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

  Future<void> deleteNotification(String id) async {
    if (id.isEmpty) return;
    await _api.deleteAny('/notifications/$id');
  }

  Future<void> clearAll() async {
    await _api.deleteAny('/notifications/my');
  }
}
