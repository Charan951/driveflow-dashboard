import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppStorage {
  static final AppStorage _instance = AppStorage._internal();
  factory AppStorage() => _instance;
  AppStorage._internal();

  static const _tokenKey = 'access_token';
  static const _userKey = 'auth_user';
  static const _themeModeKey = 'theme_mode';
  static const _dashboardKey = 'dashboard_state';

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: false,
      sharedPreferencesName: 'speshway_storage',
      resetOnError: true,
    ),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<void> setToken(String token) async {
    try {
      await _storage.write(key: _tokenKey, value: token);
    } catch (e) {
      // Silent catch
    }
  }

  Future<String?> getToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearToken() async {
    try {
      await _storage.delete(key: _tokenKey);
    } catch (e) {
      // Silent catch
    }
  }

  Future<void> setUserJson(String userJson) async {
    try {
      await _storage.write(key: _userKey, value: userJson);
    } catch (e) {
      // Silent catch
    }
  }

  Future<String?> getUserJson() async {
    try {
      return await _storage.read(key: _userKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearUser() async {
    try {
      await _storage.delete(key: _userKey);
    } catch (e) {
      // Silent catch
    }
  }

  Future<void> setDashboardJson(String value) async {
    try {
      await _storage.write(key: _dashboardKey, value: value);
    } catch (e) {
      // Silent catch
    }
  }

  Future<String?> getDashboardJson() async {
    try {
      return await _storage.read(key: _dashboardKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearDashboard() async {
    try {
      await _storage.delete(key: _dashboardKey);
    } catch (e) {
      // Silent catch
    }
  }

  Future<void> setThemeMode(String mode) async {
    try {
      await _storage.write(key: _themeModeKey, value: mode);
    } catch (e) {
      // Silent catch
    }
  }

  Future<String?> getThemeMode() async {
    try {
      return await _storage.read(key: _themeModeKey);
    } catch (e) {
      return null;
    }
  }
}
