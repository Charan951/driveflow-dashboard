import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppStorage {
  static final AppStorage _instance = AppStorage._internal();
  factory AppStorage() => _instance;
  AppStorage._internal();

  static const _tokenKey = 'staff_access_token';
  static const _userKey = 'staff_auth_user';
  static const _themeModeKey = 'theme_mode';
  static const _hasSeenOnboardingKey = 'has_seen_onboarding';

  /// Cleared on app uninstall; used to wipe Keychain leftovers on fresh install.
  static const _installMarkerKey = 'staff_install_marker';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      sharedPreferencesName: 'carzzi_staff_storage',
      resetOnError: true,
    ),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  SharedPreferences? _prefs;

  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
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

  Future<void> setHasSeenOnboarding(bool value) async {
    try {
      final prefs = await _getPrefs();
      await prefs.setBool(_hasSeenOnboardingKey, value);
    } catch (e) {
      // Silent catch
    }
  }

  Future<bool> hasSeenOnboarding() async {
    try {
      final prefs = await _getPrefs();
      return prefs.getBool(_hasSeenOnboardingKey) ?? false;
    } catch (e) {
      return false;
    }
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

  Future<void> clearAll() async {
    try {
      await _secureStorage.deleteAll();
      final prefs = await _getPrefs();
      final themeMode = prefs.getString(_themeModeKey);
      final hasSeenOnboarding = prefs.getBool(_hasSeenOnboardingKey);
      await prefs.clear();
      if (themeMode != null) {
        await prefs.setString(_themeModeKey, themeMode);
      }
      if (hasSeenOnboarding != null) {
        await prefs.setBool(_hasSeenOnboardingKey, hasSeenOnboarding);
      }
    } catch (e) {
      // Silent catch
    }
  }

  /// iOS Keychain can survive uninstall; SharedPreferences does not.
  /// On first launch after install, clear stale secure credentials.
  Future<void> ensureStorageMatchesInstall() async {
    try {
      final prefs = await _getPrefs();
      if (prefs.containsKey(_installMarkerKey)) return;
      await clearAll();
      await prefs.setString(
        _installMarkerKey,
        DateTime.now().toUtc().toIso8601String(),
      );
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
}
