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

  void setArguments(Object? args) {
    _arguments = args;
    notifyListeners();
  }

  // Map route names to tab indices
  static const Map<String, int> routeToTabIndex = {
    '/car-wash': 0,
    '/services': 1,
    '/customer': 2,
    '/tires': 3,
    '/battery': 4,
  };

  void navigateTo(String routeName, {Object? arguments}) {
    final index = routeToTabIndex[routeName];
    if (index != null) {
      setTab(index, arguments: arguments);
    }
  }

  /// After booking confirmation — land on home tab and refresh dashboard.
  void goHomeAfterBooking() {
    _selectedIndex = 2;
    _arguments = null;
    _shouldRefreshDashboard = true;
    notifyListeners();
  }

  /// Flags the dashboard to refetch next time it's visible, without
  /// forcing a tab switch. Needed after login/signup: MainNavigationPage
  /// (and the CarzziDashboard inside it) is a single long-lived instance —
  /// if it was already mounted while browsing as a guest, logging in
  /// updates it in place rather than remounting it, so its one-time
  /// initState fetch (made while unauthenticated) never reruns on its own.
  void requestDashboardRefresh() {
    _shouldRefreshDashboard = true;
    notifyListeners();
  }
}
