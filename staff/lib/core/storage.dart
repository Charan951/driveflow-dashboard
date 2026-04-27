import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppStorage {
  static final AppStorage _instance = AppStorage._internal();
  factory AppStorage() => _instance;
  AppStorage._internal();

  static const _tokenKey = 'staff_access_token';
  static const _userKey = 'staff_auth_user';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      resetOnError: true,
    ),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  SharedPreferences? _prefs;

  Future<SharedPreferences> get _nonSensitiveStorage async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  Future<void> setToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return _secureStorage.read(key: _tokenKey);
  }

  Future<void> clearToken() async {
    await _secureStorage.delete(key: _tokenKey);
  }

  Future<void> setUserJson(String userJson) async {
    final prefs = await _nonSensitiveStorage;
    await prefs.setString(_userKey, userJson);
  }

  Future<String?> getUserJson() async {
    final prefs = await _nonSensitiveStorage;
    return prefs.getString(_userKey);
  }

  Future<void> clearUser() async {
    final prefs = await _nonSensitiveStorage;
    await prefs.remove(_userKey);
  }

  Future<String?> getUserId() async {
    final userJson = await getUserJson();
    if (userJson == null) return null;
    try {
      final user = jsonDecode(userJson);
      return (user['_id'] ?? user['id'])?.toString();
    } catch (e) {
      return null;
    }
  }

  Future<String?> getUserRole() async {
    final userJson = await getUserJson();
    if (userJson == null) return null;
    try {
      final user = jsonDecode(userJson);
      return user['role']?.toString();
    } catch (e) {
      return null;
    }
  }
}
