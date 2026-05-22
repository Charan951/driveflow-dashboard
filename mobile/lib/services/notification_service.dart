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
import '../core/app_colors.dart';
import '../main.dart'; // Import to use rootNavigatorKey

// Background message handler
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  final data = message.data;
  final type = data['type']?.toString();

  final local = FlutterLocalNotificationsPlugin();
  const initializationSettings = InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    iOS: DarwinInitializationSettings(),
  );
  await local.initialize(initializationSettings);
  await PlatformUtils.createAndroidNotificationChannels(local);

  if (type == 'live_tracking_dismiss') {
    await NotificationService.dismissLiveTrackingNotification(
      data['bookingId']?.toString(),
      local,
    );
    return;
  }

  if (NotificationService.isMerchantApprovalPayload(data)) {
    await NotificationService.presentMerchantApprovalNotification(data, local);
    return;
  }

  if (NotificationService.isPaymentPendingPayload(data)) {
    await NotificationService.presentPaymentPendingNotification(data, local);
    return;
  }

  // Collapse live ETA when the booking reaches a terminal leg (system will also show FCM banner).
  if (message.notification != null) {
    if (type == 'status') {
      final st =
          (data['status']?.toString() ??
                  data['bookingStatus']?.toString() ??
                  '')
              .toUpperCase();
      if ([
        'REACHED_CUSTOMER',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
      ].contains(st)) {
        await NotificationService.dismissLiveTrackingNotification(
          data['bookingId']?.toString(),
          local,
        );
      }
    }
    return;
  }

  if (type == 'live_tracking') {
    await NotificationService.presentLiveTrackingNotification(data, local);
    return;
  }

  // Other data-only pushes: show a generic local notification.
  final subType = data['subType']?.toString();
  final status =
      data['status']?.toString() ?? data['bookingStatus']?.toString();

  if (!NotificationService.isNotificationAllowed(
    type: type,
    subType: subType,
    status: status,
  )) {
    return;
  }

  final title =
      data['title']?.toString() ??
      data['notificationTitle']?.toString() ??
      'Carzzi';
  final body =
      data['body']?.toString() ??
      data['message']?.toString() ??
      'You have a new update';

  await local.show(
    DateTime.now().millisecondsSinceEpoch.remainder(100000),
    NotificationService.normalizeNotificationTitle(title),
    body,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        'high_importance_channel',
        'High Importance Notifications',
        channelDescription: 'This channel is used for important notifications.',
        importance: Importance.max,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
        visibility: NotificationVisibility.public,
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    ),
    payload: jsonEncode(data),
  );
}

@pragma('vm:entry-point')
void _onDidReceiveBackgroundNotificationResponse(
  NotificationResponse response,
) {
  unawaited(_onBackgroundLocalNotificationTap(response));
}

Future<void> _onBackgroundLocalNotificationTap(
  NotificationResponse response,
) async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await FlutterLocalNotificationsPlugin().cancelAll();
  } catch (_) {}
  try {
    await NotificationService()._handleNotificationClick(
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
  final String? dataType;
  final bool isRead;
  final DateTime createdAt;
  final String? bookingId;
  final String? approvalId;
  final String? partName;
  final int? quantity;
  final double? unitPrice;
  final double? totalAmount;
  final String? approvalImage;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    this.dataType,
    required this.isRead,
    required this.createdAt,
    this.bookingId,
    this.approvalId,
    this.partName,
    this.quantity,
    this.unitPrice,
    this.totalAmount,
    this.approvalImage,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    String? extractedBookingId;
    String? extractedApprovalId;
    final rawData = json['data'];
    final data = rawData is Map<String, dynamic>
        ? rawData
        : (rawData is Map ? Map<String, dynamic>.from(rawData) : null);
    final directBookingId = json['bookingId']?.toString();
    if (directBookingId != null && directBookingId.isNotEmpty) {
      extractedBookingId = directBookingId;
    } else if (data != null) {
      final dataBookingId = data['bookingId']?.toString();
      if (dataBookingId != null && dataBookingId.isNotEmpty) {
        extractedBookingId = dataBookingId;
      } else {
        final dataRelatedId = data['relatedId'];
        if (dataRelatedId is String && dataRelatedId.isNotEmpty) {
          extractedBookingId = dataRelatedId;
        } else if (dataRelatedId is Map) {
          final relatedMap = dataRelatedId;
          final id = (relatedMap['_id'] ?? relatedMap['id'])?.toString();
          if (id != null && id.isNotEmpty) extractedBookingId = id;
        }
      }
      final dataApprovalId = data['approvalId']?.toString();
      if (dataApprovalId != null && dataApprovalId.isNotEmpty) {
        extractedApprovalId = dataApprovalId;
      }
    }

    double? parseAmount(dynamic v) {
      if (v == null) return null;
      return double.tryParse(v.toString());
    }

    int? parseQty(dynamic v) {
      if (v == null) return null;
      return int.tryParse(v.toString());
    }

    final partName = data?['partName']?.toString();
    final quantity = parseQty(data?['quantity']);
    final unitPrice = parseAmount(data?['unitPrice']);
    final totalAmount = parseAmount(data?['totalAmount']);
    final approvalImage = data?['image']?.toString();

    if (extractedBookingId == null) {
      final booking = json['booking'];
      if (booking is String && booking.isNotEmpty) {
        extractedBookingId = booking;
      } else if (booking is Map) {
        final bookingMap = booking;
        final id = (bookingMap['_id'] ?? bookingMap['id'])?.toString();
        if (id != null && id.isNotEmpty) extractedBookingId = id;
      }
      if (extractedBookingId == null) {
        final relatedId = json['relatedId'];
        if (relatedId is String && relatedId.isNotEmpty) {
          extractedBookingId = relatedId;
        } else if (relatedId is Map) {
          final relatedMap = relatedId;
          final id = (relatedMap['_id'] ?? relatedMap['id'])?.toString();
          if (id != null && id.isNotEmpty) extractedBookingId = id;
        }
      }
    }

    return NotificationItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: NotificationService.normalizeNotificationTitle(
        (json['title'] ?? '').toString(),
      ),
      message: (json['body'] ?? json['message'] ?? '').toString(),
      type: (json['type'] ?? 'info').toString(),
      dataType: data?['type']?.toString(),
      isRead: json['isRead'] == true,
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      bookingId: extractedBookingId,
      approvalId: extractedApprovalId,
      partName: partName,
      quantity: quantity,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      approvalImage: approvalImage,
    );
  }
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final ApiClient _api = ApiClient();
  FirebaseMessaging? _messaging;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  /// FCM often replays the same `live_tracking` data message when the app
  /// resumes right after the user opened from that notification — suppress
  /// re-posting for this booking briefly (main isolate).
  static DateTime? _skipLiveTrackingReshowUntil;
  static String? _skipLiveTrackingReshowBookingId;

  /// Identical live_tracking payloads in a tight window (e.g. double delivery).
  static String? _liveTrackingDedupeKey;
  static DateTime? _liveTrackingDedupeAt;

  static String? _dedupeFcmOpenMessageId;
  static DateTime? _dedupeFcmOpenAt;

  /// Re-use one tray slot per booking for in-app booking pings (socket + mirrored FCM).
  /// Namespace separate from [liveTrackingNotificationId] (raw hash).
  static int inAppBookingSummaryNotificationId(String bookingId) {
    if (bookingId.isEmpty) return 9100003;
    final h = Object.hash('inAppBookingSummary', bookingId) & 0x0fffffff;
    return 1200000000 + h;
  }

  static String? _inAppBookingDedupeKey;
  static DateTime? _inAppBookingDedupeAt;

  static bool _dedupeInAppBookingPing(String key) {
    final now = DateTime.now();
    if (_inAppBookingDedupeKey == key &&
        _inAppBookingDedupeAt != null &&
        now.difference(_inAppBookingDedupeAt!) < const Duration(seconds: 8)) {
      return true;
    }
    _inAppBookingDedupeKey = key;
    _inAppBookingDedupeAt = now;
    return false;
  }

  static String normalizeNotificationTitle(String title) {
    final normalized = title.trim().toLowerCase();
    if (normalized == 'bill updated') {
      return 'Payment awaiting';
    }
    return title;
  }

  /// Stable per-booking id so live ETA updates replace the same notification.
  static int liveTrackingNotificationId(String bookingId) {
    if (bookingId.isEmpty) return 9100001;
    final h = bookingId.hashCode & 0x7fffffff;
    return h == 0 ? 9100001 : h;
  }

  static bool isMerchantApprovalPayload(Map<String, dynamic> data) {
    final type = data['type']?.toString();
    final approvalId = data['approvalId']?.toString() ?? '';
    return approvalId.isNotEmpty &&
        (type == 'merchant_approval' ||
            type == 'approval_request' ||
            type == 'approval');
  }

  static int merchantApprovalNotificationId(String approvalId) {
    if (approvalId.isEmpty) return 9100002;
    final h = Object.hash('merchantApproval', approvalId) & 0x0fffffff;
    return 1300000000 + h;
  }

  static Future<void> presentMerchantApprovalNotification(
    Map<String, dynamic> data,
    FlutterLocalNotificationsPlugin plugin,
  ) async {
    if (kIsWeb) return;
    await PlatformUtils.createAndroidNotificationChannels(plugin);

    final approvalId = data['approvalId']?.toString() ?? '';
    final title = normalizeNotificationTitle(
      data['title']?.toString() ?? 'Merchant Approvals',
    );

    final partName = data['partName']?.toString() ?? '';
    final quantity = data['quantity']?.toString() ?? '';
    final unitPrice = data['unitPrice']?.toString() ?? '';
    final totalAmount = data['totalAmount']?.toString() ?? '';
    final approvalType = data['approvalType']?.toString() ?? '';

    String body;
    if (approvalType == 'PartReplacement' &&
        partName.isNotEmpty &&
        quantity.isNotEmpty &&
        totalAmount.isNotEmpty) {
      body = '$partName × $quantity = ₹$totalAmount';
    } else if (approvalType == 'ExtraCost' && totalAmount.isNotEmpty) {
      body = 'Extra Cost: ₹$totalAmount';
    } else if (approvalType == 'BillEdit' && totalAmount.isNotEmpty) {
      body = 'Bill Updated: ₹$totalAmount';
    } else {
      body =
          data['body']?.toString() ??
          'New approval request from your merchant.';
    }

    const androidDetails = AndroidNotificationDetails(
      'merchant_approval_channel',
      'Merchant Approvals',
      channelDescription:
          'Part and cost approvals from your merchant with quick actions.',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      visibility: NotificationVisibility.public,
      category: AndroidNotificationCategory.message,
      actions: <AndroidNotificationAction>[
        AndroidNotificationAction(
          'approval_reject',
          'Reject',
          showsUserInterface: false,
          cancelNotification: true,
        ),
        AndroidNotificationAction(
          'approval_accept',
          'Accept',
          showsUserInterface: false,
          cancelNotification: true,
        ),
      ],
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      categoryIdentifier: 'merchant_approval',
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    await plugin.show(
      merchantApprovalNotificationId(approvalId),
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: jsonEncode(data),
    );
  }

  static bool isPaymentPendingPayload(Map<String, dynamic> data) {
    final type = data['type']?.toString();
    final bookingId = data['bookingId']?.toString() ?? '';
    return bookingId.isNotEmpty && type == 'service_completed_payment_pending';
  }

  static int paymentPendingNotificationId(String bookingId) {
    if (bookingId.isEmpty) return 9100003;
    final h = Object.hash('paymentPending', bookingId) & 0x0fffffff;
    return 1400000000 + h;
  }

  static Future<void> presentPaymentPendingNotification(
    Map<String, dynamic> data,
    FlutterLocalNotificationsPlugin plugin,
  ) async {
    if (kIsWeb) return;
    await PlatformUtils.createAndroidNotificationChannels(plugin);

    final bookingId = data['bookingId']?.toString() ?? '';
    final title = normalizeNotificationTitle(
      data['title']?.toString() ?? 'Service complete — payment due',
    );
    final body =
        data['body']?.toString() ??
        'Your service is complete. Tap Pay to complete payment.';

    const androidDetails = AndroidNotificationDetails(
      'payment_pending_channel',
      'Payment due',
      channelDescription:
          'Alerts when service is complete and payment is pending.',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      visibility: NotificationVisibility.public,
      category: AndroidNotificationCategory.message,
      actions: <AndroidNotificationAction>[
        AndroidNotificationAction(
          'payment_pay_action',
          'Pay',
          showsUserInterface: true,
          cancelNotification: true,
        ),
      ],
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      categoryIdentifier: 'payment_pending',
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    await plugin.show(
      paymentPendingNotificationId(bookingId),
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: jsonEncode(data),
    );
  }

  static Future<void> dismissLiveTrackingNotification(
    String? bookingId,
    FlutterLocalNotificationsPlugin plugin,
  ) async {
    if (bookingId == null || bookingId.isEmpty) return;
    await plugin.cancel(liveTrackingNotificationId(bookingId));
  }

  static Future<void> presentLiveTrackingNotification(
    Map<String, dynamic> data,
    FlutterLocalNotificationsPlugin plugin,
  ) async {
    await PlatformUtils.createAndroidNotificationChannels(plugin);
    final bookingId = data['bookingId']?.toString() ?? '';
    final now = DateTime.now();

    if (bookingId.isNotEmpty &&
        _skipLiveTrackingReshowBookingId == bookingId &&
        _skipLiveTrackingReshowUntil != null &&
        now.isBefore(_skipLiveTrackingReshowUntil!)) {
      return;
    }

    final dm = data['distanceMeters']?.toString() ?? '';
    final pr = data['progress']?.toString() ?? '';
    final dedupeKey = '$bookingId|$dm|$pr';
    if (_liveTrackingDedupeKey == dedupeKey &&
        _liveTrackingDedupeAt != null &&
        now.difference(_liveTrackingDedupeAt!) < const Duration(seconds: 6)) {
      return;
    }
    _liveTrackingDedupeKey = dedupeKey;
    _liveTrackingDedupeAt = now;

    final id = liveTrackingNotificationId(bookingId);
    final titleRaw = data['title']?.toString().trim();
    final title = normalizeNotificationTitle(
      (titleRaw != null && titleRaw.isNotEmpty) ? titleRaw : 'Live tracking',
    );
    final bodyRaw = data['body']?.toString().trim();
    final body = (bodyRaw != null && bodyRaw.isNotEmpty)
        ? bodyRaw
        : 'Staff is approaching';
    final progress =
        int.tryParse(data['progress']?.toString() ?? '0')?.clamp(0, 100) ?? 0;

    await plugin.show(
      id,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'tracking_channel',
          'Live Tracking',
          channelDescription:
              'Live distance while staff is driving to you or returning your vehicle.',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          visibility: NotificationVisibility.public,
          ongoing: true,
          autoCancel: false,
          onlyAlertOnce: true,
          category: AndroidNotificationCategory.transport,
          showProgress: true,
          maxProgress: 100,
          progress: progress,
          subText: '$progress% · tap to open map',
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: false,
          presentSound: false,
          subtitle: '$progress% · $body',
          threadIdentifier: 'live_track_${bookingId.isEmpty ? 'x' : bookingId}',
          interruptionLevel: InterruptionLevel.timeSensitive,
        ),
      ),
      payload: jsonEncode(data),
    );
  }

  Future<FirebaseMessaging> _getMessaging() async {
    if (_messaging != null) return _messaging!;
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }
    _messaging = FirebaseMessaging.instance;
    return _messaging!;
  }

  static final List<String> allowedBookingStatuses = [
    'CREATED',
    'ASSIGNED',
    'REACHED_CUSTOMER',
    'STAFF_REACHED_MERCHANT',
    'SERVICE_STARTED',
    'CAR_WASH_STARTED',
    'INSTALLATION',
    'SERVICE_COMPLETED',
    'CAR_WASH_COMPLETED',
    'COMPLETED',
    'DELIVERY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ];

  void showApprovalDialog(String title, String body, String approvalId) {
    final context = rootNavigatorKey.currentContext;
    if (context == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return AlertDialog(
          backgroundColor: isDark
              ? AppColors.backgroundSecondary
              : Colors.white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            title,
            style: TextStyle(
              color: isDark ? Colors.white : Colors.black87,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(
            body,
            style: TextStyle(color: isDark ? Colors.white70 : Colors.black54),
          ),
          actions: [
            TextButton(
              onPressed: () => _updateApprovalStatus(approvalId, 'Rejected'),
              child: const Text(
                'Reject',
                style: TextStyle(
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () => _updateApprovalStatus(approvalId, 'Approved'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Accept'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _updateApprovalStatus(String approvalId, String status) async {
    final context = rootNavigatorKey.currentContext;
    if (context != null) Navigator.of(context).pop();
    await updateApprovalStatusFromNotification(approvalId, status);
  }

  static Future<void> updateApprovalStatusFromNotification(
    String approvalId,
    String status,
  ) async {
    try {
      final api = ApiClient();
      await api.putAny('/approvals/$approvalId', body: {'status': status});

      final currentContext = rootNavigatorKey.currentContext;
      if (currentContext != null && currentContext.mounted) {
        ScaffoldMessenger.of(currentContext).showSnackBar(
          SnackBar(
            content: Text(
              status == 'Approved'
                  ? 'Approval accepted.'
                  : 'Approval rejected.',
            ),
            backgroundColor: status == 'Approved' ? Colors.green : Colors.red,
          ),
        );
      }
    } catch (e) {
      final currentContext = rootNavigatorKey.currentContext;
      if (currentContext != null && currentContext.mounted) {
        final message = e is ApiException ? e.message : e.toString();
        ScaffoldMessenger.of(currentContext).showSnackBar(
          SnackBar(
            content: Text(
              message.toLowerCase().contains('already resolved')
                  ? 'This approval is already resolved.'
                  : 'Failed to update approval: $message',
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  static bool isNotificationAllowed({
    String? type,
    String? subType,
    String? status,
  }) {
    if (type == 'live_tracking' || type == 'live_tracking_dismiss') {
      return true;
    }

    // 1. Booked (CREATED)
    // 2. Assigned (ASSIGNED)
    // 3. Staff Reached (REACHED_CUSTOMER, STAFF_REACHED_MERCHANT)
    // 4. Service Started (SERVICE_STARTED, CAR_WASH_STARTED, INSTALLATION)
    // 5. Service Completed (SERVICE_COMPLETED, CAR_WASH_COMPLETED, COMPLETED)
    // 7. Delivery (DELIVERY, OUT_FOR_DELIVERY, DELIVERED)
    if (status != null &&
        allowedBookingStatuses.contains(status.toUpperCase())) {
      return true;
    }

    // 6. Waiting for payment
    if (type == 'payment' || subType == 'billing') {
      return true;
    }

    // 8. Merchant Approvals
    if (type == 'approval' || type == 'approval_request') {
      return true;
    }

    // Special case for types that imply the allowed statuses
    if (type == 'booking_created' || type == 'order') {
      return true;
    }

    if (type == 'assignment_update' || type == 'assignment') {
      return true;
    }

    if (type == 'staff_reached_location' || type == 'nearby') {
      return true;
    }

    if (type == 'service_started') {
      return true;
    }

    if (type == 'merchant_approval') {
      return true;
    }

    if (type == 'service_completed_payment_pending') {
      return true;
    }

    if (type == 'delivery_otp' || type == 'otp') {
      return true;
    }

    if (type == 'feedback') {
      return true;
    }

    return false;
  }

  Future<void> initialize() async {
    if (kIsWeb) {
      _initialized = true;
      return;
    }
    if (_initialized) return;

    // 1. Initialize Local Notifications
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    final DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
          notificationCategories: <DarwinNotificationCategory>[
            DarwinNotificationCategory(
              'merchant_approval',
              actions: <DarwinNotificationAction>[
                DarwinNotificationAction.plain('approval_accept', 'Accept'),
                DarwinNotificationAction.plain(
                  'approval_reject',
                  'Reject',
                  options: <DarwinNotificationActionOption>{
                    DarwinNotificationActionOption.destructive,
                  },
                ),
              ],
            ),
            DarwinNotificationCategory(
              'payment_pending',
              actions: <DarwinNotificationAction>[
                DarwinNotificationAction.plain('payment_pay_action', 'Pay'),
              ],
            ),
          ],
        );

    final InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsIOS,
        );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        unawaited(
          _handleNotificationClick(
            response.payload,
            actionId: response.actionId,
          ),
        );
      },
      onDidReceiveBackgroundNotificationResponse:
          _onDidReceiveBackgroundNotificationResponse,
    );

    // 2. Create Android Notification Channels
    await PlatformUtils.createAndroidNotificationChannels(_localNotifications);

    // 3. Set up FCM listeners (onBackgroundMessage is registered once in main.dart)
    final messaging = await _getMessaging();

    await messaging.setForegroundNotificationPresentationOptions(
      alert: false, // Prevent double notifications in foreground
      badge: true,
      sound: true,
    );

    // Foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      _showLocalNotification(message);
    });

    // Background/Terminated state message click
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      unawaited(
        _handleNotificationClick(
          jsonEncode(message.data),
          fcmMessageId: message.messageId,
        ),
      );
    });

    // Handle initial message if app was terminated
    RemoteMessage? initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      await _handleNotificationClick(
        jsonEncode(initialMessage.data),
        fcmMessageId: initialMessage.messageId,
      );
    }

    // 4. Token Management (Listeners only, actual sync happens in syncToken)
    await _setupTokenListeners();

    _initialized = true;
  }

  Future<void> requestPermissions() async {
    if (kIsWeb) return;
    final messaging = await _getMessaging();
    await PlatformUtils.requestMobilePermissions(messaging);
  }

  Future<void> _setupTokenListeners() async {
    if (kIsWeb) return;
    final messaging = await _getMessaging();

    // Listen for token refresh
    messaging.onTokenRefresh.listen((newToken) {
      syncToken();
    });
  }

  Future<void> syncToken() async {
    if (kIsWeb) return;
    try {
      final messaging = await _getMessaging();
      final token = await messaging.getToken();
      if (token == null) return;

      String deviceType = PlatformUtils.deviceType;
      await _api.postAny(
        '/users/fcm-token',
        body: {'token': token, 'deviceType': deviceType},
      );

      // Subscribe to topics
      await messaging.subscribeToTopic('all_users');
      await messaging.subscribeToTopic('customers');
    } catch (e) {
      // Ignore
    }
  }

  void _showLocalNotification(RemoteMessage message) async {
    if (kIsWeb) return;

    final data = message.data;
    final type = data['type']?.toString();
    final subType = data['subType']?.toString();
    final status =
        data['status']?.toString() ?? data['bookingStatus']?.toString();

    if (type == 'live_tracking_dismiss') {
      await NotificationService.dismissLiveTrackingNotification(
        data['bookingId']?.toString(),
        _localNotifications,
      );
      return;
    }

    if (type == 'live_tracking') {
      if (!isNotificationAllowed(
        type: type,
        subType: subType,
        status: status,
      )) {
        return;
      }
      await NotificationService.presentLiveTrackingNotification(
        data,
        _localNotifications,
      );
      return;
    }

    if (NotificationService.isMerchantApprovalPayload(data)) {
      await NotificationService.presentMerchantApprovalNotification(
        data,
        _localNotifications,
      );
      return;
    }

    if (NotificationService.isPaymentPendingPayload(data)) {
      await NotificationService.presentPaymentPendingNotification(
        data,
        _localNotifications,
      );
      return;
    }

    if (!isNotificationAllowed(type: type, subType: subType, status: status)) {
      return;
    }

    RemoteNotification? notification = message.notification;
    String? imageUrl =
        message.data['image'] ??
        notification?.android?.imageUrl ??
        notification?.apple?.imageUrl;

    if (notification != null) {
      if (type == 'status') {
        final st = (status ?? '').toUpperCase();
        if ([
          'REACHED_CUSTOMER',
          'DELIVERED',
          'COMPLETED',
          'CANCELLED',
        ].contains(st)) {
          await NotificationService.dismissLiveTrackingNotification(
            data['bookingId']?.toString(),
            _localNotifications,
          );
        }
      }

      final bid = data['bookingId']?.toString();
      const bookingSummaryTypes = <String>{
        'status',
        'order',
        'booking_update',
        'assignment_update',
        'assignment',
        'nearby',
        'staff_reached_location',
        'service_started',
        'merchant_approval',
        'delivery_otp',
        'feedback',
      };
      final bool fcmBookingSummary =
          bid != null &&
          bid.isNotEmpty &&
          ((type != null && bookingSummaryTypes.contains(type)) ||
              (type == null &&
                  status != null &&
                  allowedBookingStatuses.contains(status.toUpperCase())));
      if (fcmBookingSummary) {
        final st = (status ?? '').toUpperCase();
        final dk = 'ping|$bid|${type ?? ''}|$st';
        if (_dedupeInAppBookingPing(dk)) {
          return;
        }
      }

      BigPictureStyleInformation? bigPictureStyleInformation;
      if (imageUrl != null && imageUrl.isNotEmpty) {
        // TODO: Download image and save locally for offline display
        bigPictureStyleInformation = BigPictureStyleInformation(
          FilePathAndroidBitmap(imageUrl),
          largeIcon: FilePathAndroidBitmap(imageUrl),
        );
      }

      final int fcmTrayId = fcmBookingSummary
          ? inAppBookingSummaryNotificationId(bid)
          : notification.hashCode;

      await _localNotifications.show(
        fcmTrayId,
        normalizeNotificationTitle(notification.title ?? 'Carzzi'),
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
            onlyAlertOnce: fcmBookingSummary,
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
    String? type,
    String? status,
    String? subType,
  }) async {
    if (kIsWeb) return;

    // Filter notifications
    if (!isNotificationAllowed(type: type, status: status, subType: subType)) {
      // If we have a payload but no explicit type/status, try to extract from payload
      if (payload != null && type == null && status == null) {
        try {
          final data = jsonDecode(payload);
          if (!isNotificationAllowed(
            type: data['type']?.toString(),
            subType: data['subType']?.toString(),
            status: (data['status'] ?? data['bookingStatus'])?.toString(),
          )) {
            return;
          }
        } catch (_) {
          // If payload is not JSON or extraction fails, we'll allow it for now
          // to avoid missing important manual notifications
        }
      } else {
        // If type/status were provided and not allowed, or no info at all, block it
        // Special case: if it's a manual notification without any booking info,
        // we might want to allow it, but the user said "and this only".
        // Let's be strict.
        if (type != null || status != null) return;
      }
    }

    String? bookingIdFromPayload;
    var effectiveType = type;
    var effectiveStatus = status;
    if (payload != null) {
      try {
        final m = Map<String, dynamic>.from(jsonDecode(payload) as Map);
        bookingIdFromPayload = m['bookingId']?.toString();
        effectiveType ??= m['type']?.toString();
        effectiveStatus ??= (m['status'] ?? m['bookingStatus'])?.toString();
      } catch (_) {}
    }

    const bookingSummaryTypes = <String>{
      'status',
      'order',
      'booking_update',
      'assignment_update',
      'assignment',
      'nearby',
      'staff_reached_location',
      'service_started',
      'merchant_approval',
      'delivery_otp',
      'feedback',
    };
    final bool useBookingSummarySlot =
        bookingIdFromPayload != null &&
        bookingIdFromPayload.isNotEmpty &&
        ((effectiveType != null &&
                bookingSummaryTypes.contains(effectiveType)) ||
            (effectiveType == null &&
                effectiveStatus != null &&
                allowedBookingStatuses.contains(
                  effectiveStatus.toUpperCase(),
                )));
    if (useBookingSummarySlot) {
      final st = (effectiveStatus ?? '').toUpperCase();
      final dk = 'ping|$bookingIdFromPayload|${effectiveType ?? ''}|$st';
      if (_dedupeInAppBookingPing(dk)) {
        return;
      }
    }

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
          onlyAlertOnce: useBookingSummarySlot,
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

    final int notificationId = useBookingSummarySlot
        ? inAppBookingSummaryNotificationId(bookingIdFromPayload)
        : (DateTime.now().millisecondsSinceEpoch % 100000);

    await _localNotifications.show(
      notificationId,
      normalizeNotificationTitle(title),
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

  /// Removes all notifications for this app from the lock screen / shade
  /// (local + FCM-displayed), then runs navigation from [payload].
  Future<void> clearAllNotificationsFromTray() async {
    if (kIsWeb) return;
    try {
      await _localNotifications.cancelAll();
    } catch (_) {}
  }

  Future<void> _handleNotificationClick(
    String? payload, {
    String? actionId,
    String? fcmMessageId,
  }) async {
    if (payload == null) return;

    Map<String, dynamic> data;
    try {
      data = Map<String, dynamic>.from(jsonDecode(payload) as Map);
    } catch (_) {
      await clearAllNotificationsFromTray();
      return;
    }

    if (fcmMessageId != null && fcmMessageId.isNotEmpty) {
      final now = DateTime.now();
      if (_dedupeFcmOpenMessageId == fcmMessageId &&
          _dedupeFcmOpenAt != null &&
          now.difference(_dedupeFcmOpenAt!) < const Duration(seconds: 5)) {
        await clearAllNotificationsFromTray();
        return;
      }
      _dedupeFcmOpenMessageId = fcmMessageId;
      _dedupeFcmOpenAt = now;
    }

    final String? bookingId = data['bookingId']?.toString();
    if (bookingId != null && bookingId.isNotEmpty) {
      _skipLiveTrackingReshowBookingId = bookingId;
      _skipLiveTrackingReshowUntil = DateTime.now().add(
        const Duration(seconds: 25),
      );
    }

    if (actionId == 'approval_accept' || actionId == 'approval_reject') {
      final approvalId = data['approvalId']?.toString() ?? '';
      if (approvalId.isNotEmpty) {
        await updateApprovalStatusFromNotification(
          approvalId,
          actionId == 'approval_accept' ? 'Approved' : 'Rejected',
        );
      }
      await clearAllNotificationsFromTray();
      return;
    }

    if (actionId == 'payment_pay_action' ||
        data['type']?.toString() == 'service_completed_payment_pending') {
      final payBookingId = data['bookingId']?.toString();
      await clearAllNotificationsFromTray();
      try {
        final context = rootNavigatorKey.currentContext;
        if (context != null &&
            context.mounted &&
            payBookingId != null &&
            payBookingId.isNotEmpty) {
          Navigator.pushNamed(context, '/track', arguments: payBookingId);
        }
      } catch (_) {}
      return;
    }

    await clearAllNotificationsFromTray();

    try {
      final context = rootNavigatorKey.currentContext;
      if (context == null || !context.mounted) return;

      final String? type = data['type']?.toString();
      final String? subType = data['subType']?.toString();

      if ((type == 'status' ||
              type == 'live_tracking' ||
              actionId == 'track_live_action') &&
          bookingId != null &&
          bookingId.isNotEmpty) {
        Navigator.pushNamed(context, '/track', arguments: bookingId);
      } else if (type == 'booking_update' || type == 'status') {
        if (bookingId != null && bookingId.isNotEmpty) {
          Navigator.pushNamed(context, '/track', arguments: bookingId);
        } else {
          Navigator.pushNamed(context, '/bookings');
        }
      } else if (type == 'payment' ||
          subType == 'billing' ||
          type == 'service_completed_payment_pending') {
        if (bookingId != null && bookingId.isNotEmpty) {
          Navigator.pushNamed(context, '/track', arguments: bookingId);
        } else {
          Navigator.pushNamed(context, '/payments');
        }
      } else if (type == 'support') {
        Navigator.pushNamed(context, '/support');
      } else if (type == 'promotion') {
        Navigator.pushNamed(context, '/speshway-dashboard');
      } else if (type == 'approval' ||
          type == 'approval_request' ||
          type == 'merchant_approval') {
        if (bookingId != null && bookingId.isNotEmpty) {
          Navigator.pushNamed(context, '/track', arguments: bookingId);
        } else {
          Navigator.pushNamed(context, '/notifications');
        }
      } else if (type == 'delivery_otp' || type == 'otp') {
        if (bookingId != null && bookingId.isNotEmpty) {
          Navigator.pushNamed(context, '/track', arguments: bookingId);
        } else {
          Navigator.pushNamed(context, '/notifications');
        }
      } else if (type == 'feedback') {
        if (bookingId != null && bookingId.isNotEmpty) {
          Navigator.pushNamed(context, '/track', arguments: bookingId);
        } else {
          Navigator.pushNamed(context, '/customer');
        }
      } else {
        Navigator.pushNamed(context, '/notifications');
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
