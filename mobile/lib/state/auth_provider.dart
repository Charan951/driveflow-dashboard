import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/storage.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _auth = AuthService();
  User? user;
  bool loading = false;
  String? lastError;

  bool get isAuthenticated => user != null;

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

  Future<void> loadMe() async {
    loading = true;
    lastError = null;
    notifyListeners();
    debugPrint('AuthProvider: Starting loadMe...');
    try {
      final token = await AppStorage().getToken();
      debugPrint(
        'AuthProvider: Token found: ${token != null && token.isNotEmpty}',
      );

      if (token == null || token.isEmpty) {
        user = null;
        loading = false;
        notifyListeners();
        debugPrint('AuthProvider: No token, user unauthenticated');
        return;
      }

      // 1. Try to load from local storage first so user sees UI immediately
      final cachedUserJson = await AppStorage().getUserJson();
      if (cachedUserJson != null && cachedUserJson.isNotEmpty) {
        try {
          debugPrint('AuthProvider: Found cached user JSON');
          final decoded = jsonDecode(cachedUserJson);
          if (decoded is Map<String, dynamic>) {
            user = User.fromJson(decoded);
          } else if (decoded is Map) {
            user = User.fromJson(Map<String, dynamic>.from(decoded));
          }
          debugPrint(
            'AuthProvider: Cached user loaded: ${user?.name} (${user?.role})',
          );
          // Notify listeners immediately so UI can update with cached user
          notifyListeners();
        } catch (e) {
          debugPrint('AuthProvider: Error decoding cached user: $e');
        }
      }

      // 2. Refresh from server in background if possible
      try {
        debugPrint('AuthProvider: Refreshing user from server...');
        final fresh = await _auth.me();
        if (fresh != null) {
          user = fresh;
          await AppStorage().setUserJson(jsonEncode(fresh.toJson()));
          debugPrint('AuthProvider: Server refresh successful: ${fresh.name}');
        }
      } on ApiException catch (e) {
        debugPrint(
          'AuthProvider: Server refresh API error (${e.statusCode}): ${e.message}',
        );
        // Only clear session if it's a definitive 401 Unauthorized
        if (e.statusCode == 401) {
          debugPrint('AuthProvider: Session expired (401), clearing storage');
          await AppStorage().clearToken();
          await AppStorage().clearUser();
          user = null;
        }
        // For other errors (network timeout, 500), we keep the cached 'user'
      } catch (e) {
        // Network error? Keep the cached user if we have one
        debugPrint('AuthProvider: Server refresh network error: $e');
      }
    } catch (e) {
      debugPrint('AuthProvider: Fatal error in loadMe: $e');
      // If we don't even have a cached user, then it's an error
      if (user == null) {
        lastError = _messageFromError(e);
      }
    }
    loading = false;
    notifyListeners();
    debugPrint(
      'AuthProvider: loadMe finished. isAuthenticated: $isAuthenticated',
    );
  }

  Future<bool> login(String email, String password) async {
    loading = true;
    lastError = null;
    notifyListeners();
    debugPrint('AuthProvider: Attempting login for $email...');
    try {
      final res = await _auth.login(email, password);
      debugPrint(
        'AuthProvider: Login response received. Token present: ${res.token != null}',
      );
      if (res.token != null && res.token!.isNotEmpty) {
        // The token is already saved by AuthService.login calling AppStorage().setToken()
        user = res.user;
        if (user == null) {
          debugPrint(
            'AuthProvider: User missing from login response, fetching via me()...',
          );
          user = await _auth.me();
          if (user != null) {
            await AppStorage().setUserJson(jsonEncode(user!.toJson()));
          }
        }
        debugPrint('AuthProvider: Login successful. User: ${user?.name}');
        loading = false;
        notifyListeners();
        return true;
      }
      debugPrint('AuthProvider: Login failed - no token in response');
      lastError = 'Login failed: No token received';
    } catch (e) {
      debugPrint('AuthProvider: Login error: $e');
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
    await _auth.logout();
    user = null;
    lastError = null;
    notifyListeners();
  }
}
