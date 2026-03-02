import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/env.dart';
import '../core/storage.dart';
import '../state/tracking_provider.dart';
import '../models/booking.dart';
import '../models/user.dart';
import 'notification_service.dart';

class SocketService extends ChangeNotifier {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  bool _isConnected = false;
  TrackingProvider? _trackingProvider;

  bool get isConnected => _isConnected;

  void setTrackingProvider(TrackingProvider provider) {
    _trackingProvider = provider;
  }

  Future<void> init([User? user]) async {
    if (_socket != null) return;

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

    _socket!.onConnect((_) {
      _isConnected = true;
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
      if (data != null && data is Map) {
        final bookingId = (data['bookingId'] ?? '').toString();
        if (_trackingProvider != null &&
            _trackingProvider!.activeBooking?.id == bookingId) {
          _trackingProvider!.updateStaffLocation(
            Map<String, dynamic>.from(data),
          );
        }
      }
    });

    _socket!.on('bookingUpdated', (data) {
      if (data != null && data is Map) {
        final bookingId = (data['_id'] ?? '').toString();
        final booking = Booking.fromJson(Map<String, dynamic>.from(data));

        if (_trackingProvider != null) {
          _trackingProvider!.updateActiveBooking(booking);
          if (TrackingProvider.trackingStatuses.contains(booking.status)) {
            joinRoom('booking_$bookingId');
          }
        }

        final orderNum =
            (data['orderNumber'] ??
                    (bookingId.length >= 6
                        ? bookingId.substring(bookingId.length - 6)
                        : bookingId))
                .toString();
        final status = (data['status'] ?? '').toString().replaceAll('_', ' ');

        NotificationService().showLocalNotification(
          title: 'Booking Updated',
          body: 'Booking #$orderNum status is now $status',
          payload: jsonEncode({'type': 'status', 'bookingId': bookingId}),
        );
      }
      notifyListeners();
    });

    _socket!.on('bookingCreated', (data) {
      if (data != null && data is Map) {
        final bookingId = (data['_id'] ?? '').toString();
        final orderNum =
            (data['orderNumber'] ??
                    (bookingId.length >= 6
                        ? bookingId.substring(bookingId.length - 6)
                        : bookingId))
                .toString();

        NotificationService().showLocalNotification(
          title: 'New Booking',
          body: 'New booking #$orderNum has been created!',
          payload: jsonEncode({'type': 'order', 'bookingId': bookingId}),
        );
      }
      notifyListeners();
    });

    _socket!.on('bookingCancelled', (data) {
      if (data != null && data is Map) {
        final bookingId = (data['_id'] ?? '').toString();
        final orderNum =
            (data['orderNumber'] ??
                    (bookingId.length >= 6
                        ? bookingId.substring(bookingId.length - 6)
                        : bookingId))
                .toString();

        NotificationService().showLocalNotification(
          title: 'Booking Cancelled',
          body: 'Booking #$orderNum has been cancelled.',
          payload: jsonEncode({'type': 'status', 'bookingId': bookingId}),
        );
      }
      notifyListeners();
    });

    _socket!.on('notification', (data) {
      if (data != null && data is Map) {
        NotificationService().showLocalNotification(
          title: (data['title'] ?? 'Notification').toString(),
          body: (data['message'] ?? data['body'] ?? '').toString(),
          payload: data['payload'] != null
              ? (data['payload'] is String
                    ? data['payload'] as String
                    : jsonEncode(data['payload']))
              : null,
        );
      }
      notifyListeners();
    });

    _socket!.on('ticketUpdated', (data) {
      NotificationService().showLocalNotification(
        title: 'Support Ticket Updated',
        body: 'A support ticket has been updated.',
        payload: jsonEncode({'type': 'support'}),
      );
      notifyListeners();
    });
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
