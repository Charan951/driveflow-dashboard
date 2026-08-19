import 'package:flutter/material.dart';

import '../pill_bottom_bar.dart';

enum StaffBottomNavTab { orders, dashboard, profile }

class StaffBottomNav extends StatelessWidget {
  final StaffBottomNavTab selectedTab;
  final ValueChanged<StaffBottomNavTab> onTabSelected;

  const StaffBottomNav({
    super.key,
    required this.selectedTab,
    required this.onTabSelected,
  });

  int _indexFromTab(StaffBottomNavTab tab) {
    switch (tab) {
      case StaffBottomNavTab.orders:
        return 0;
      case StaffBottomNavTab.dashboard:
        return 1;
      case StaffBottomNavTab.profile:
        return 2;
    }
  }

  StaffBottomNavTab _tabFromIndex(int index) {
    switch (index) {
      case 0:
        return StaffBottomNavTab.orders;
      case 1:
        return StaffBottomNavTab.dashboard;
      default:
        return StaffBottomNavTab.profile;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppPillBottomBar.staffMerchant(
      selectedIndex: _indexFromTab(selectedTab),
      onTap: (index) => onTabSelected(_tabFromIndex(index)),
    );
  }
}
