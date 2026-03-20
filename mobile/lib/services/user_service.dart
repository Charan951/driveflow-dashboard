import '../core/api_client.dart';
import '../core/env.dart';
import '../models/user.dart';

class UserService {
  final ApiClient _api = ApiClient();

  Future<List<User>> getAllUsers({String? role, String? subRole}) async {
    String url = '/users';
    final params = <String>[];
    if (role != null) params.add('role=$role');
    if (subRole != null) params.add('subRole=$subRole');
    if (params.isNotEmpty) url += '?${params.join('&')}';

    final res = await _api.getAny(url);
    final items = <User>[];
    if (res is List) {
      for (final e in res) {
        if (e is Map<String, dynamic>) {
          items.add(User.fromJson(e));
        } else if (e is Map) {
          items.add(User.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }
    return items;
  }

  Future<User> getUserById(String id) async {
    final res = await _api.getAny('/users/$id');
    if (res is Map<String, dynamic>) return User.fromJson(res);
    if (res is Map) return User.fromJson(Map<String, dynamic>.from(res));
    throw Exception('Failed to get user');
  }

  Future<User> updateProfile(Map<String, dynamic> data) async {
    final res = await _api.putAny(ApiEndpoints.usersProfile, body: data);
    if (res is Map<String, dynamic>) return User.fromJson(res);
    if (res is Map) return User.fromJson(Map<String, dynamic>.from(res));
    throw Exception('Failed to update profile');
  }

  Future<Map<String, dynamic>> approveUser(String id) async {
    return await _api.putAny('/users/$id/approve');
  }

  Future<Map<String, dynamic>> rejectUser(String id, String reason) async {
    return await _api.putAny('/users/$id/reject', body: {'reason': reason});
  }

  Future<Map<String, dynamic>> deleteUser(String id) async {
    return await _api.deleteAny('/users/$id');
  }
}
