import 'dart:convert';
import '../core/api_client.dart';
import '../core/env.dart';
import '../core/storage.dart';
import '../models/user.dart';

class AuthResult {
  final String? token;
  final User? user;

  AuthResult({required this.token, required this.user});
}

class AuthService {
  final ApiClient _api = ApiClient();

  Future<AuthResult> register(
    String name,
    String email,
    String password, {
    String? phone,
    String role = 'customer',
  }) async {
    final res = await _api.postJson(
      ApiEndpoints.authRegister,
      body: {
        'name': name,
        'email': email,
        'password': password,
        'role': role,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
    final token = (res['accessToken'] ?? res['token'])?.toString();
    final user = _userFromAuthResponse(res);

    if (token != null && token.isNotEmpty) {
      await AppStorage().setToken(token);
    }
    if (user != null) {
      await AppStorage().setUserJson(jsonEncode(user.toJson()));
    }

    return AuthResult(token: token, user: user);
  }

  Future<AuthResult> login(String email, String password) async {
    final res = await _api.postJson(
      ApiEndpoints.authLogin,
      body: {'email': email, 'password': password},
    );
    final token = (res['accessToken'] ?? res['token'])?.toString();
    final user = _userFromAuthResponse(res);

    if (token != null && token.isNotEmpty) {
      await AppStorage().setToken(token);
    }
    if (user != null) {
      await AppStorage().setUserJson(jsonEncode(user.toJson()));
    }

    return AuthResult(token: token, user: user);
  }

  Future<User?> me() async {
    final res = await _api.getJson(ApiEndpoints.usersMe);
    if (res['user'] is Map<String, dynamic>) {
      return User.fromJson(res['user'] as Map<String, dynamic>);
    }
    return User.fromJson(res);
  }

  Future<void> logout() async {
    await AppStorage().clearToken();
    await AppStorage().clearUser();
  }

  User? _userFromAuthResponse(Map<String, dynamic> res) {
    final userCandidate = res['user'];
    if (userCandidate is Map<String, dynamic>) {
      return User.fromJson(userCandidate);
    }
    if (userCandidate is Map) {
      return User.fromJson(Map<String, dynamic>.from(userCandidate));
    }

    if (res['_id'] != null || res['id'] != null) {
      return User.fromJson(res);
    }
    return null;
  }
}
