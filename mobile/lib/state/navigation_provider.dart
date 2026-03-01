import 'package:flutter/material.dart';

class NavigationProvider with ChangeNotifier {
  int _selectedIndex = 2; // Default to Home (CustomerDashboardPage)
  Object? _arguments;
  bool _shouldRefreshDashboard = false;

  int get selectedIndex => _selectedIndex;
  Object? get arguments => _arguments;
  bool get shouldRefreshDashboard => _shouldRefreshDashboard;

  void setTab(int index, {Object? arguments, bool refreshDashboard = false}) {
    _selectedIndex = index;
    _arguments = arguments;
    if (refreshDashboard) {
      _shouldRefreshDashboard = true;
    }
    notifyListeners();
  }

  void consumeRefresh() {
    _shouldRefreshDashboard = false;
  }

  void clearArguments() {
    _arguments = null;
  }

  // Map route names to tab indices
  static const Map<String, int> routeToTabIndex = {
    '/services': 0,
    '/insurance': 1,
    '/customer': 2,
    '/car-wash': 3,
    '/tires': 4,
  };

  void navigateTo(String routeName, {Object? arguments}) {
    final index = routeToTabIndex[routeName];
    if (index != null) {
      setTab(index, arguments: arguments);
    }
  }
}
