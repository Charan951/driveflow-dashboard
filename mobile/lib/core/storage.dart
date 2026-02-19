import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppStorage {
  static final AppStorage _instance = AppStorage._internal();
  factory AppStorage() => _instance;
  AppStorage._internal();

  static const _tokenKey = 'access_token';
  static const _userKey = 'auth_user';
  static const _themeModeKey = 'theme_mode';

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      // Adding these to be safer
      resetOnError: true,
    ),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<void> setToken(String token) async {
    try {
      debugPrint('AppStorage: Writing token...');
      await _storage.write(key: _tokenKey, value: token);
      // Verification read
      final verified = await _storage.read(key: _tokenKey);
      debugPrint(
        'AppStorage: Token written. Verification success: ${verified == token}',
      );
    } catch (e) {
      debugPrint('AppStorage: Error saving token: $e');
    }
  }

  Future<String?> getToken() async {
    try {
      debugPrint('AppStorage: Reading token...');
      final token = await _storage.read(key: _tokenKey);
      debugPrint(
        'AppStorage: Token read: ${token != null && token.isNotEmpty}',
      );
      return token;
    } catch (e) {
      debugPrint('AppStorage: Error reading token: $e');
      return null;
    }
  }

  Future<void> clearToken() async {
    try {
      await _storage.delete(key: _tokenKey);
    } catch (e) {
      debugPrint('Error clearing token: $e');
    }
  }

  Future<void> setUserJson(String userJson) async {
    try {
      debugPrint('AppStorage: Writing user JSON...');
      await _storage.write(key: _userKey, value: userJson);
      debugPrint('AppStorage: User JSON written.');
    } catch (e) {
      debugPrint('AppStorage: Error saving user json: $e');
    }
  }

  Future<String?> getUserJson() async {
    try {
      debugPrint('AppStorage: Reading user JSON...');
      final json = await _storage.read(key: _userKey);
      debugPrint(
        'AppStorage: User JSON read: ${json != null && json.isNotEmpty}',
      );
      return json;
    } catch (e) {
      debugPrint('AppStorage: Error reading user json: $e');
      return null;
    }
  }

  Future<void> clearUser() async {
    try {
      await _storage.delete(key: _userKey);
    } catch (e) {
      debugPrint('Error clearing user: $e');
    }
  }

  Future<void> setThemeMode(String mode) async {
    try {
      await _storage.write(key: _themeModeKey, value: mode);
    } catch (e) {
      debugPrint('AppStorage: Error saving theme mode: $e');
    }
  }

  Future<String?> getThemeMode() async {
    try {
      return await _storage.read(key: _themeModeKey);
    } catch (e) {
      debugPrint('AppStorage: Error reading theme mode: $e');
      return null;
    }
  }
}
