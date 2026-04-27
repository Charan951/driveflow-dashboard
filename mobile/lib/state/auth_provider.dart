import 'dart:convert';
import 'package:flutter/material.dart';
import '../main.dart'; // import rootNavigatorKey
import '../core/api_client.dart';
import '../core/storage.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';

import '../services/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _auth = AuthService();
  User? user;
  bool loading = false;
  bool _isInitialized = false;
  String? lastError;

  AuthProvider() {
    SocketService().addListener(_onSocketEvent);
  }

  @override
  void dispose() {
    SocketService().removeListener(_onSocketEvent);
    super.dispose();
  }

  void _onSocketEvent() {
    final event = SocketService().value;
    if (event == null) return;

    if (event.startsWith('role_updated:')) {
      try {
        final payloadStr = event.substring('role_updated:'.length);
        final data = jsonDecode(payloadStr) as Map<String, dynamic>;
        if (user != null) {
          final updatedUser = User.fromJson({
            ...user!.toJson(),
            'role': data['role'] ?? user!.role,
            'subRole': data['subRole'] ?? user!.subRole,
          });
          user = updatedUser;
          AppStorage().setUserJson(jsonEncode(updatedUser.toJson()));
          notifyListeners();

          // We used to force navigation here, but it was too abrupt and caused data loss
          // for users in the middle of a flow. Instead, we just update the user state
          // and let the next app restart or manual navigation handle the view change.
          // RootGate will also switch the background view if the user is at the root.

          if (rootNavigatorKey.currentContext != null) {
            final role = updatedUser.role?.toLowerCase() ?? 'user';
            ScaffoldMessenger.of(rootNavigatorKey.currentContext!).showSnackBar(
              SnackBar(
                content: Text('Your role has been updated to $role.'),
                duration: const Duration(seconds: 5),
                behavior: SnackBarBehavior.floating,
                action: SnackBarAction(
                  label: 'Refresh',
                  onPressed: () {
                    final h = homeRoute;
                    rootNavigatorKey.currentState?.pushNamedAndRemoveUntil(
                      h,
                      (route) => false,
                    );
                  },
                ),
              ),
            );
          }
        }
      } catch (e) {
        // Ignore
      }
    } else if (event.contains('sync:user') || event.contains('sync:setting')) {
      // Reload user data from server for global sync events
      _refreshUserInBackground();
    }
  }

  bool get isAuthenticated => user != null;
  bool get isInitialized => _isInitialized;

  String _messageFromError(Object error) {
    if (error is ApiException) {
      return error.message;
    }
    final raw = error.toString();
    if (raw.startsWith('ApiException')) {
      return raw;
    }
    if (raw.startsWith('Exception: ')) {
      return raw.substring('Exception: '.length);
    }
    return raw;
  }

  String get homeRoute {
    final role = user?.role;
    if (role == 'merchant') return '/merchant';
    if (role == 'staff') return '/staff';
    if (role == 'admin') return '/admin';
    return '/customer';
  }

  Future<void> refreshUser() async {
    await _refreshUserInBackground();
  }

  Future<void> loadMe({bool force = false}) async {
    if (loading) return;
    if (_isInitialized && !force) {
      return;
    }

    lastError = null;

    try {
      final token = await AppStorage().getToken();
      if (token == null || token.isEmpty) {
        user = null;
        loading = false;
        _isInitialized = true;
        notifyListeners();
        return;
      }

      // 1. Try to load from local storage first
      final cachedUserJson = await AppStorage().getUserJson();
      if (cachedUserJson != null && cachedUserJson.isNotEmpty) {
        try {
          final decoded = jsonDecode(cachedUserJson);
          User? cachedUser;
          if (decoded is Map<String, dynamic>) {
            cachedUser = User.fromJson(decoded);
          } else if (decoded is Map) {
            cachedUser = User.fromJson(Map<String, dynamic>.from(decoded));
          }

          if (cachedUser != null) {
            user = cachedUser;
            _isInitialized = true;
            loading = false;
            notifyListeners();

            // Initialize socket service with cached session
            SocketService().init(user);

            // Start background refresh without awaiting it
            _refreshUserInBackground();
            return;
          }
        } catch (e) {
          // Silent catch
        }
      }

      // If we don't have a cached user, we must wait for the server
      loading = true;
      notifyListeners();
      await _refreshUserInBackground();
    } catch (e) {
      if (user == null) {
        lastError = _messageFromError(e);
      }
    } finally {
      loading = false;
      _isInitialized = true;
      notifyListeners();
    }
  }

  Future<void> _refreshUserInBackground() async {
    try {
      final fresh = await _auth.me();
      if (fresh != null) {
        final oldUserJson = user != null ? jsonEncode(user!.toJson()) : null;
        final newUserJson = jsonEncode(fresh.toJson());

        user = fresh;
        await AppStorage().setUserJson(newUserJson);

        // Only notify if the user data actually changed from the cached version
        if (oldUserJson != newUserJson) {
          notifyListeners();
        }
        SocketService().init(user);
      }
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        await AppStorage().clearToken();
        await AppStorage().clearUser();
        user = null;
        notifyListeners();
      }
    } catch (e) {
      // Silent catch
    }
  }

  Future<bool> login(String email, String password) async {
    // Clear old session before login
    await logout();

    loading = true;
    lastError = null;
    notifyListeners();
    try {
      final res = await _auth.login(email, password);
      if (res.token != null && res.token!.isNotEmpty) {
        // The token is already saved by AuthService.login calling AppStorage().setToken()
        user = res.user;
        if (user == null) {
          user = await _auth.me();
          if (user != null) {
            await AppStorage().setUserJson(jsonEncode(user!.toJson()));
          }
        }
        await AppStorage().clearHasSeenNoVehicleModal();
        SocketService().init(user);
        NotificationService().syncToken();
        loading = false;
        notifyListeners();
        return true;
      }
      lastError = 'Login failed: No token received';
    } catch (e) {
      lastError = _messageFromError(e);
    }
    loading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register(
    String name,
    String email,
    String password, {
    String? phone,
  }) async {
    // Clear old session before register
    await logout();

    loading = true;
    lastError = null;
    notifyListeners();
    try {
      final res = await _auth.register(name, email, password, phone: phone);
      if (res.token != null && res.token!.isNotEmpty) {
        user = res.user;
        if (user == null) {
          user = await _auth.me();
          if (user != null) {
            await AppStorage().setUserJson(jsonEncode(user!.toJson()));
          }
        }
        await AppStorage().clearHasSeenNoVehicleModal();
        SocketService().init(user);
        NotificationService().syncToken();
        loading = false;
        notifyListeners();
        return true;
      }
      lastError = 'Registration failed';
    } catch (e) {
      lastError = _messageFromError(e);
    }
    loading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    loading = true;
    notifyListeners();
    try {
      // 1. Clear state in providers
      SocketService().trackingProvider?.clear();
      SocketService().disconnect();

      // 2. Clear storage
      await AppStorage().clearToken();
      await AppStorage().clearUser();
      await AppStorage().clearDashboard();
      await AppStorage().clearHasSeenNoVehicleModal();

      // 3. Call backend logout (optional, depends on implementation)
      try {
        await _auth.logout();
      } catch (e) {
        // Ignore backend logout errors
      }

      // 4. Reset local state
      user = null;
      lastError = null;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> updateProfile({
    String? name,
    String? email,
    String? phone,
    List<SavedAddress>? addresses,
    List<PaymentMethod>? paymentMethods,
  }) async {
    loading = true;
    lastError = null;
    notifyListeners();
    try {
      final updatedUser = await _auth.updateProfile(
        name: name,
        email: email,
        phone: phone,
        addresses: addresses,
        paymentMethods: paymentMethods,
      );
      if (updatedUser != null) {
        user = updatedUser;
      }
    } catch (e) {
      lastError = _messageFromError(e);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}
