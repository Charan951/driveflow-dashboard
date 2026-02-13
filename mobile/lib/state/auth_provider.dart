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
    try {
      final token = await AppStorage().getToken();
      if (token == null || token.isEmpty) {
        user = null;
        loading = false;
        notifyListeners();
        return;
      }

      final cachedUserJson = await AppStorage().getUserJson();
      if (cachedUserJson != null && cachedUserJson.isNotEmpty) {
        final decoded = jsonDecode(cachedUserJson);
        if (decoded is Map<String, dynamic>) {
          user = User.fromJson(decoded);
        } else if (decoded is Map) {
          user = User.fromJson(Map<String, dynamic>.from(decoded));
        }
      }

      try {
        final fresh = await _auth.me();
        if (fresh != null) {
          user = fresh;
          await AppStorage().setUserJson(jsonEncode(fresh.toJson()));
        }
      } on ApiException catch (e) {
        if (e.statusCode == 401) {
          await AppStorage().clearToken();
          await AppStorage().clearUser();
          user = null;
        }
      }
    } catch (e) {
      user = null;
      lastError = _messageFromError(e);
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    loading = true;
    lastError = null;
    notifyListeners();
    try {
      final res = await _auth.login(email, password);
      if (res.token != null && res.token!.isNotEmpty) {
        user = res.user ?? await _auth.me();
        loading = false;
        notifyListeners();
        return true;
      }
      lastError = 'Login failed';
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
        user = res.user ?? await _auth.me();
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
