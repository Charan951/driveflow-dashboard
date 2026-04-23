import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/env.dart';
import '../core/storage.dart';
import '../core/api_client.dart';
import '../core/app_colors.dart';
import '../main.dart';
import '../state/tracking_provider.dart';
import '../models/booking.dart';
import '../models/user.dart';
import 'notification_service.dart';

class SocketService extends ValueNotifier<String?> {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal() : super(null);

  io.Socket? _socket;
  bool _isConnected = false;
  TrackingProvider? _trackingProvider;

  bool get isConnected => _isConnected;

  void setTrackingProvider(TrackingProvider provider) {
    _trackingProvider = provider;
  }

  Future<void> init([User? user]) async {
    // If user is provided, we should re-initialize if needed to ensure token is sent
    if (user != null) {
      disconnect();
    } else if (_socket != null) {
      // If socket already exists but got disconnected (e.g. app background/resume),
      // force reconnect so listeners keep receiving live updates.
      if (!_isConnected) {
        _socket!.connect();
      }
      return;
    }

    if (user != null && _trackingProvider != null) {
      _trackingProvider!.init(user.role, user.id);
    }

    final token = await AppStorage().getToken();

    // Create socket instance
    _socket = io.io(
      Env.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableForceNew()
          .setAuth(token != null ? {'token': token} : {})
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) async {
      _isConnected = true;

      // Join mandatory rooms
      final userId = await AppStorage().getUserId();
      final role = await AppStorage().getUserRole();

      if (userId != null) {
        joinRoom('user_$userId');
      }
      if (role != null) {
        joinRoom(role.toLowerCase());
      }

      if (_trackingProvider?.activeBooking != null) {
        joinRoom('booking_${_trackingProvider!.activeBooking!.id}');
      }
      notifyListeners();
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      notifyListeners();
    });

    _socket!.onConnectError((data) {
      _isConnected = false;
      notifyListeners();
    });

    _socket!.on('liveLocation', (data) {
      if (data != null) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final bookingId = (mapData['bookingId'] ?? '').toString();
          if (_trackingProvider != null &&
              _trackingProvider!.activeBooking?.id == bookingId) {
            _trackingProvider!.updateStaffLocation(mapData);
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    _socket!.on('user_role_updated', (data) {
      if (data != null) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          // Notify listeners about role update with the data payload
          value = 'role_updated:${jsonEncode(mapData)}';
          notifyListeners();
        } catch (e) {
          // Ignore
        }
      }
    });

    _socket!.on('bookingUpdated', (data) {
      value = 'booking_updated';

      if (data != null) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final bookingId = (mapData['_id'] ?? '').toString();
          final booking = Booking.fromJson(mapData);

          if (_trackingProvider != null) {
            _trackingProvider!.updateActiveBooking(booking);
            if (TrackingProvider.trackingStatuses.contains(booking.status)) {
              joinRoom('booking_$bookingId');
            }
          }

          final orderNum =
              (mapData['orderNumber'] ??
                      (bookingId.length >= 6
                          ? bookingId.substring(bookingId.length - 6)
                          : bookingId))
                  .toString();
          final status = (mapData['status'] ?? '').toString().replaceAll(
            '_',
            ' ',
          );

          NotificationService().showLocalNotification(
            title: 'Booking Updated',
            body: 'Booking #$orderNum status is now $status',
            payload: jsonEncode({'type': 'status', 'bookingId': bookingId}),
            type: 'status',
            status: mapData['status']?.toString(),
          );
        } catch (e) {
          // Ignore
        }
      }
      notifyListeners();
    });

    _socket!.on('bookingCreated', (data) {
      value = 'booking_created';
      if (data != null) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final bookingId = (mapData['_id'] ?? '').toString();
          final orderNum =
              (mapData['orderNumber'] ??
                      (bookingId.length >= 6
                          ? bookingId.substring(bookingId.length - 6)
                          : bookingId))
                  .toString();

          NotificationService().showLocalNotification(
            title: 'New Booking',
            body: 'New booking #$orderNum has been created!',
            payload: jsonEncode({'type': 'order', 'bookingId': bookingId}),
            type: 'order',
            status: 'CREATED',
          );
        } catch (e) {
          // Ignore
        }
      }
      notifyListeners();
    });

    _socket!.on('bookingCancelled', (data) {
      value = 'booking_cancelled';
      if (data != null) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final bookingId = (mapData['_id'] ?? '').toString();
          final orderNum =
              (mapData['orderNumber'] ??
                      (bookingId.length >= 6
                          ? bookingId.substring(bookingId.length - 6)
                          : bookingId))
                  .toString();

          NotificationService().showLocalNotification(
            title: 'Booking Cancelled',
            body: 'Booking #$orderNum has been cancelled.',
            payload: jsonEncode({'type': 'status', 'bookingId': bookingId}),
            type: 'status',
            status: 'CANCELLED',
          );
        } catch (e) {
          // Ignore
        }
      }
      notifyListeners();
    });

    _socket!.on('newApproval', (data) {
      value = 'new_approval';
      if (data != null) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final approvalId = (mapData['_id'] ?? '').toString();
          final type = (mapData['type'] ?? '').toString();
          final approvalData = mapData['data'] ?? {};

          final title = type == 'PartReplacement'
              ? 'New Part Approval'
              : type == 'ExtraCost'
              ? 'Extra Cost Approval'
              : 'New Approval Request';

          final body = type == 'PartReplacement'
              ? 'A new part replacement (${approvalData['name']}) requires your approval.'
              : type == 'ExtraCost'
              ? 'An extra cost of ₹${approvalData['amount']} requires your approval for: ${approvalData['reason']}'
              : 'A new request requires your approval.';

          NotificationService().showLocalNotification(
            title: title,
            body: body,
            payload: jsonEncode({
              'type': 'approval',
              'bookingId': (mapData['relatedId'] ?? '').toString(),
              'approvalId': approvalId,
            }),
            type: 'approval',
          );

          // No foreground popup dialog; keep notification-based flow only.
        } catch (e) {
          // Ignore
        }
      }
      notifyListeners();
    });

    _socket!.on('userStatusUpdate', (data) {
      value = 'user_status_update';
      if (data != null) {
        // Handle user status update if needed (e.g. show staff online/offline)
        notifyListeners();
      }
    });

    _socket!.on('notification', (data) {
      value = 'notification';
      if (data != null) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final payload = mapData['payload'] != null
              ? (mapData['payload'] is String
                    ? mapData['payload'] as String
                    : jsonEncode(mapData['payload']))
              : null;

          Map<String, dynamic>? payloadData;
          if (payload != null) {
            try {
              payloadData = jsonDecode(payload);
            } catch (_) {}
          }

          NotificationService().showLocalNotification(
            title: (mapData['title'] ?? 'Notification').toString(),
            body: (mapData['message'] ?? mapData['body'] ?? '').toString(),
            payload: payload,
            type: payloadData?['type']?.toString(),
            status: (payloadData?['status'] ?? payloadData?['bookingStatus'])
                ?.toString(),
            subType: payloadData?['subType']?.toString(),
          );
        } catch (e) {
          // Ignore
        }
      }
      notifyListeners();
    });

    _socket!.on('ticketUpdated', (data) {
      value = 'ticket_updated';
      NotificationService().showLocalNotification(
        title: 'Support Ticket Updated',
        body: 'A support ticket has been updated.',
        payload: jsonEncode({'type': 'support'}),
        type: 'support',
      );
      notifyListeners();
    });

    _socket!.on('global:sync', (data) {
      if (data != null) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final entity = (mapData['entity'] ?? '').toString();
          final action = (mapData['action'] ?? '').toString();

          // Update the value to notify listeners of a specific entity sync
          value = 'sync:$entity:$action';
          notifyListeners();

          // Show notification for important creations
          if (action == 'created' &&
              (entity == 'booking' || entity == 'ticket')) {
            // Already handled by specific events, but this is a fallback
          }
        } catch (e) {
          // Ignore
        }
      }
    });
  }

  void sendEvent(String eventName) {
    value = eventName;
    notifyListeners();
  }

  Future<void> reconnect() async {
    disconnect();
    await init();
  }

  void on(String event, Function(dynamic) callback) {
    _socket?.on(event, callback);
  }

  void off(String event, [Function(dynamic)? callback]) {
    _socket?.off(event, callback);
  }

  void emit(String event, [dynamic data]) {
    _socket?.emit(event, data);
  }

  void joinRoom(String room) {
    emit('join', room);
  }

  void leaveRoom(String room) {
    emit('leave', room);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }
}
