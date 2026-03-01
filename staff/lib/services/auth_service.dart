import 'dart:convert';

import '../core/api_client.dart';
import '../core/env.dart';
import '../core/storage.dart';
import '../models/user.dart';

class AuthService {
  final ApiClient _api = ApiClient();

  Future<StaffUser> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.postJson(
      ApiEndpoints.authLogin,
      body: {'email': email, 'password': password},
    );

    final token = response['token']?.toString();
    if (token == null || token.isEmpty) {
      throw ApiException(statusCode: 500, message: 'Missing token in response');
    }

    final role = response['role']?.toString();
    if (role != 'staff' && role != 'admin' && role != 'merchant') {
      throw ApiException(
        statusCode: 403,
        message: 'Access denied. Authorized account required.',
      );
    }

    final storage = AppStorage();
    await storage.setToken(token);
    await storage.setUserJson(jsonEncode(response));

    return StaffUser.fromJson(response);
  }

  Future<StaffUser?> getCurrentUser() async {
    final json = await AppStorage().getUserJson();
    if (json == null || json.isEmpty) return null;
    final map = jsonDecode(json) as Map<String, dynamic>;
    return StaffUser.fromJson(map);
  }

  Future<void> logout() async {
    final storage = AppStorage();
    await storage.clearToken();
    await storage.clearUser();
  }

  Future<void> updateOnlineStatus(bool isOnline) async {
    await _api.putJson(
      ApiEndpoints.usersOnlineStatus,
      body: {'isOnline': isOnline},
    );
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    final response = await _api.putJson(ApiEndpoints.authProfile, body: data);
    final storage = AppStorage();
    await storage.setUserJson(jsonEncode(response));
  }
}
