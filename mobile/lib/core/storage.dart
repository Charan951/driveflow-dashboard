import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppStorage {
  static final AppStorage _instance = AppStorage._internal();
  factory AppStorage() => _instance;
  AppStorage._internal();

  static const _tokenKey = 'access_token';
  static const _userKey = 'auth_user';
  static const _themeModeKey = 'theme_mode';
  static const _dashboardKey = 'dashboard_state';
  static const _hasSeenNoVehicleModalKey = 'has_seen_no_vehicle_modal';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      sharedPreferencesName: 'speshway_storage',
      resetOnError: true,
    ),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  SharedPreferences? _prefs;

  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  Future<void> setHasSeenNoVehicleModal(bool value) async {
    try {
      final prefs = await _getPrefs();
      await prefs.setBool(_hasSeenNoVehicleModalKey, value);
    } catch (e) {
      // Silent catch
    }
  }

  Future<bool> getHasSeenNoVehicleModal() async {
    try {
      final prefs = await _getPrefs();
      return prefs.getBool(_hasSeenNoVehicleModalKey) ?? false;
    } catch (e) {
      return false;
    }
  }

  Future<void> clearHasSeenNoVehicleModal() async {
    try {
      final prefs = await _getPrefs();
      await prefs.remove(_hasSeenNoVehicleModalKey);
    } catch (e) {
      // Silent catch
    }
  }

  Future<void> setToken(String token) async {
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
    } catch (e) {
      // Silent catch
    }
  }

  Future<String?> getToken() async {
    try {
      return await _secureStorage.read(key: _tokenKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearToken() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
    } catch (e) {
      // Silent catch
    }
  }

  Future<void> setUserJson(String userJson) async {
    try {
      await _secureStorage.write(key: _userKey, value: userJson);
    } catch (e) {
      // Silent catch
    }
  }

  Future<String?> getUserJson() async {
    try {
      return await _secureStorage.read(key: _userKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearUser() async {
    try {
      await _secureStorage.delete(key: _userKey);
    } catch (e) {
      // Silent catch
    }
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

  Future<void> setDashboardJson(String value) async {
    try {
      final prefs = await _getPrefs();
      await prefs.setString(_dashboardKey, value);
    } catch (e) {
      // Silent catch
    }
  }

  Future<String?> getDashboardJson() async {
    try {
      final prefs = await _getPrefs();
      return prefs.getString(_dashboardKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearDashboard() async {
    try {
      final prefs = await _getPrefs();
      await prefs.remove(_dashboardKey);
    } catch (e) {
      // Silent catch
    }
  }

  Future<void> setThemeMode(String mode) async {
    try {
      final prefs = await _getPrefs();
      await prefs.setString(_themeModeKey, mode);
    } catch (e) {
      // Silent catch
    }
  }

  Future<String?> getThemeMode() async {
    try {
      final prefs = await _getPrefs();
      return prefs.getString(_themeModeKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearAll() async {
    try {
      await _secureStorage.deleteAll();
      final prefs = await _getPrefs();
      await prefs.clear();
    } catch (e) {
      // Silent catch
    }
  }
}
