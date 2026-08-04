import 'package:flutter/material.dart';

import '../core/storage.dart';

class ThemeProvider extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;
  bool _isLoaded = false;

  ThemeMode get mode => _mode;
  bool get isLoaded => _isLoaded;

  Future<void> loadThemeMode() async {
    if (_isLoaded) return;
    final stored = await AppStorage().getThemeMode();
    if (stored == 'light') {
      _mode = ThemeMode.light;
    } else if (stored == 'dark') {
      _mode = ThemeMode.dark;
    } else if (stored == 'system') {
      _mode = ThemeMode.system;
    } else {
      // No preference saved yet; follow the device setting.
      _mode = ThemeMode.system;
    }
    _isLoaded = true;
    notifyListeners();
  }

  void toggleTheme() {
    if (_mode == ThemeMode.dark) {
      setThemeMode(ThemeMode.light);
    } else {
      setThemeMode(ThemeMode.dark);
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (_mode == mode) return;
    _mode = mode;
    notifyListeners();
    AppStorage().setThemeMode(_mode.name);
  }
}
