import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/storage.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _auth = AuthService();
  User? user;
  bool loading = false;
  bool _isInitialized = false;
  String? lastError;

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
            SocketService().init();

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
        SocketService().init();
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
        SocketService().init();
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
        SocketService().init();
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
      await _auth.logout();
      SocketService().disconnect();
      await AppStorage().clearDashboard();
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
