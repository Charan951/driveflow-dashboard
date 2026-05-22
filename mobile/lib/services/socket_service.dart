import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/env.dart';
import '../core/storage.dart';
import '../state/tracking_provider.dart';
import '../models/booking.dart';
import '../models/user.dart';

class SocketService extends ValueNotifier<String?> {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal() : super(null);

  io.Socket? _socket;
  bool _isConnected = false;
  TrackingProvider? _trackingProvider;
  User? _currentUser;
  final Map<String, List<Function(dynamic)>> _pendingHandlers = {};

  bool get isConnected => _isConnected;

  TrackingProvider? get trackingProvider => _trackingProvider;

  void setTrackingProvider(TrackingProvider provider) {
    _trackingProvider = provider;
  }

  Future<void> init([User? user]) async {
    // If user is provided, update our local reference
    if (user != null) {
      _currentUser = user;
      disconnect();
    } else if (_socket != null) {
      // If socket already exists but got disconnected (e.g. app background/resume),
      // force reconnect so listeners keep receiving live updates.
      if (!_isConnected) {
        _socket!.connect();
      }
      return;
    }

    if (_currentUser != null && _trackingProvider != null) {
      _trackingProvider!.init(_currentUser!.role, _currentUser!.id);
    }

    final token = await AppStorage().getToken();

    // Create socket instance
    _socket = io.io(
      Env.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableForceNew()
          .setAuth(token != null ? {'token': token} : {})
          .enableAutoConnect()
          .build(),
    );

    // Apply any pending handlers
    _pendingHandlers.forEach((event, callbacks) {
      for (var cb in callbacks) {
        _socket!.on(event, cb);
      }
    });

    _socket!.onConnect((_) async {
      _isConnected = true;
      value = 'connected';

      // Join mandatory rooms using the user object if we have it,
      // otherwise fallback to storage (but storage is less reliable during login/reg)
      String? userId = _currentUser?.id;
      String? role = _currentUser?.role;

      if (userId == null || role == null) {
        userId = await AppStorage().getUserId();
        role = await AppStorage().getUserRole();
      }

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
      value = 'disconnected';
      notifyListeners();
    });

    _socket!.onConnectError((data) {
      _isConnected = false;
      value = 'connect_error';
      debugPrint('Socket Connect Error: $data');
      notifyListeners();
    });

    _socket!.on('liveLocation', (data) {
      if (data != null) {
        try {
          final mapData = data is Map<String, dynamic>
              ? data
              : Map<String, dynamic>.from(data as Map);
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
          final mapData = data is Map<String, dynamic>
              ? data
              : Map<String, dynamic>.from(data as Map);
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
          final mapData = data is Map<String, dynamic>
              ? data
              : Map<String, dynamic>.from(data as Map);
          final bookingId = (mapData['_id'] ?? '').toString();
          final booking = Booking.fromJson(mapData);

          if (_trackingProvider != null) {
            _trackingProvider!.updateActiveBooking(booking);
            if (TrackingProvider.trackingStatuses.contains(booking.status)) {
              joinRoom('booking_$bookingId');
            }
          }
        } catch (e) {
          // Ignore
        }
      }
      notifyListeners();
    });

    _socket!.on('bookingCreated', (data) {
      value = 'booking_created';
      notifyListeners();
    });

    _socket!.on('bookingCancelled', (data) {
      value = 'booking_cancelled';
      notifyListeners();
    });

    _socket!.on('newApproval', (data) {
      value = 'new_approval';
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
      notifyListeners();
    });

    _socket!.on('ticketUpdated', (data) {
      value = 'ticket_updated';
      notifyListeners();
    });

    _socket!.on('global:sync', (data) {
      if (data != null) {
        try {
          final mapData = data is Map<String, dynamic>
              ? data
              : Map<String, dynamic>.from(data as Map);
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
    _pendingHandlers.putIfAbsent(event, () => []).add(callback);
    _socket?.on(event, callback);
  }

  void off(String event, [Function(dynamic)? callback]) {
    if (callback != null) {
      _pendingHandlers[event]?.remove(callback);
    } else {
      _pendingHandlers.remove(event);
    }
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
    _currentUser = null;
  }
}
