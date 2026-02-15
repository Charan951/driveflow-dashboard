import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppStorage {
  static final AppStorage _instance = AppStorage._internal();
  factory AppStorage() => _instance;
  AppStorage._internal();

  static const _tokenKey = 'staff_access_token';
  static const _userKey = 'staff_auth_user';

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      resetOnError: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  Future<void> setToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return _storage.read(key: _tokenKey);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<void> setUserJson(String userJson) async {
    await _storage.write(key: _userKey, value: userJson);
  }

  Future<String?> getUserJson() async {
    return _storage.read(key: _userKey);
  }

  Future<void> clearUser() async {
    await _storage.delete(key: _userKey);
  }
}

