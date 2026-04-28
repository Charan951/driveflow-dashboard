import 'package:flutter/material.dart';
import '../../core/app_colors.dart';

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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final selectedColor = isDark ? const Color(0xFF1D4ED8) : const Color(0xFF2563EB);

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderColor : Colors.grey[200]!,
          ),
        ),
      ),
      child: SafeArea(
        child: BottomNavigationBar(
          currentIndex: _indexFromTab(selectedTab),
          onTap: (index) => onTabSelected(_tabFromIndex(index)),
          type: BottomNavigationBarType.fixed,
          backgroundColor: isDark ? AppColors.backgroundSecondary : Colors.white,
          selectedItemColor: selectedColor,
          unselectedItemColor: Colors.grey[600],
          selectedLabelStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
          unselectedLabelStyle: const TextStyle(fontSize: 12),
          elevation: 0,
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.list_alt_rounded),
              label: 'Orders',
              activeIcon: Icon(Icons.list_alt_rounded, color: selectedColor),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.dashboard_rounded),
              label: 'Dashboard',
              activeIcon: Icon(Icons.dashboard_rounded, color: selectedColor),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.person_rounded),
              label: 'Profile',
              activeIcon: Icon(Icons.person_rounded, color: selectedColor),
            ),
          ],
        ),
      ),
    );
  }
}
