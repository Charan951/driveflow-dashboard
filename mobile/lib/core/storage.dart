import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppStorage {
  static const _tokenKey = 'access_token';
  static const _userKey = 'auth_user';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> setToken(String token) {
    return _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() {
    return _storage.read(key: _tokenKey);
  }

  Future<void> clearToken() {
    return _storage.delete(key: _tokenKey);
  }

  Future<void> setUserJson(String userJson) {
    return _storage.write(key: _userKey, value: userJson);
  }

  Future<String?> getUserJson() {
    return _storage.read(key: _userKey);
  }

  Future<void> clearUser() {
    return _storage.delete(key: _userKey);
  }
}
