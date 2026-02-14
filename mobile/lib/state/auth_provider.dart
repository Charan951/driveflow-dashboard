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
      debugPrint('AuthProvider: loadMe skipped (already initialized)');
      return;
    }

    lastError = null;
    debugPrint('AuthProvider: Starting loadMe (force: $force)...');

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
            // Notify so UI can show cached user immediately
            notifyListeners();
          }
        } catch (e) {
          debugPrint('AuthProvider: Error decoding cached user: $e');
        }
      }

      // If we don't have a user yet, show loading state
      if (user == null) {
        loading = true;
        notifyListeners();
      }

      // 2. Refresh from server in background
      try {
        final fresh = await _auth.me();
        if (fresh != null) {
          final oldUserJson = user != null ? jsonEncode(user!.toJson()) : null;
          final newUserJson = jsonEncode(fresh.toJson());

          user = fresh;
          await AppStorage().setUserJson(newUserJson);

          // Only notify if the user data actually changed from the cached version
          if (oldUserJson != newUserJson) {
            debugPrint('AuthProvider: User updated from server (data changed)');
            notifyListeners();
          } else {
            debugPrint('AuthProvider: User data from server matches cache');
          }
        }
      } on ApiException catch (e) {
        if (e.statusCode == 401) {
          await AppStorage().clearToken();
          await AppStorage().clearUser();
          user = null;
          notifyListeners();
        }
      } catch (e) {
        debugPrint('AuthProvider: Server refresh network error: $e');
      }
    } catch (e) {
      debugPrint('AuthProvider: Fatal error in loadMe: $e');
      if (user == null) {
        lastError = _messageFromError(e);
      }
    } finally {
      loading = false;
      _isInitialized = true;
      notifyListeners();
    }
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
