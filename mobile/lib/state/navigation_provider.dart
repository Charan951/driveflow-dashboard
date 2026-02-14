import 'package:flutter/material.dart';

class NavigationProvider with ChangeNotifier {
  int _selectedIndex = 2; // Default to Home (CustomerDashboardPage)
  Object? _arguments;

  int get selectedIndex => _selectedIndex;
  Object? get arguments => _arguments;

  void setTab(int index, {Object? arguments}) {
    _selectedIndex = index;
    _arguments = arguments;
    notifyListeners();
  }

  void clearArguments() {
    _arguments = null;
  }

  // Map route names to tab indices
  static const Map<String, int> routeToTabIndex = {
    '/vehicles': 0,
    '/services': 1,
    '/customer': 2,
    '/bookings': 3,
    '/profile': 4,
  };

  void navigateTo(String routeName, {Object? arguments}) {
    final index = routeToTabIndex[routeName];
    if (index != null) {
      setTab(index, arguments: arguments);
    }
  }
}
