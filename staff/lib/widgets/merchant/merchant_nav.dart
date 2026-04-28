import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../core/app_colors.dart';
import '../../state/theme_provider.dart';
import '../app_side_nav_logo.dart';

class MerchantNavItem {
  final IconData icon;
  final String label;
  final String route;

  const MerchantNavItem({
    required this.icon,
    required this.label,
    required this.route,
  });
}

const List<MerchantNavItem> allMerchantNavItems = [
  MerchantNavItem(
    icon: Icons.home,
    label: 'Dashboard',
    route: '/merchant-dashboard',
  ),
  MerchantNavItem(
    icon: Icons.assignment_outlined,
    label: 'Orders',
    route: '/merchant-orders',
  ),
  MerchantNavItem(
    icon: Icons.message_outlined,
    label: 'Feedback',
    route: '/merchant-feedback',
  ),
  MerchantNavItem(
    icon: Icons.people_outline,
    label: 'Users',
    route: '/merchant-users',
  ),
  MerchantNavItem(
    icon: Icons.person_outline,
    label: 'Profile',
    route: '/merchant-profile',
  ),
];

class MerchantScaffold extends StatefulWidget {
  final Widget body;
  final String title;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  const MerchantScaffold({
    super.key,
    required this.body,
    required this.title,
    this.actions,
    this.floatingActionButton,
  });

  @override
  State<MerchantScaffold> createState() => _MerchantScaffoldState();
}

class _MerchantScaffoldState extends State<MerchantScaffold> {
  final AuthService _authService = AuthService();
  List<MerchantNavItem> _filteredItems = [];
  bool _isShopOpen = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await _authService.getCurrentUser();
    if (mounted) {
      setState(() {
        _filteredItems = allMerchantNavItems.where((item) {
          if (item.label == 'Users') {
            return user?.role == 'admin';
          }
          return true;
        }).toList();
        _isShopOpen = user?.isShopOpen ?? true;
      });
    }
  }

  Future<void> _toggleShopStatus(bool value) async {
    final previousStatus = _isShopOpen;
    setState(() => _isShopOpen = value);
    try {
      await _authService.updateProfile({'isShopOpen': value});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(value ? 'Shop is now Open' : 'Shop is now Closed')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _isShopOpen = previousStatus);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update shop status')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentRoute = ModalRoute.of(context)?.settings.name;
    final int currentIndex = _filteredItems.indexWhere(
      (item) => item.route == currentRoute,
    );

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundPrimary : Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: isDark ? AppColors.backgroundPrimary : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
        title: Text(
          widget.title,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF1E3A8A),
          ),
        ),
        actions: widget.actions,
      ),
      drawer: MerchantDrawer(
        filteredItems: _filteredItems,
        isShopOpen: _isShopOpen,
        onShopStatusChanged: _toggleShopStatus,
      ),
      body: widget.body,
      bottomNavigationBar: _filteredItems.isEmpty
          ? null
          : MerchantBottomNav(
              currentIndex: currentIndex >= 0 ? currentIndex : 0,
              filteredItems: _filteredItems,
            ),
      floatingActionButton: widget.floatingActionButton,
    );
  }
}

class MerchantDrawer extends StatelessWidget {
  final List<MerchantNavItem> filteredItems;
  final bool isShopOpen;
  final ValueChanged<bool> onShopStatusChanged;
  const MerchantDrawer({
    super.key,
    required this.filteredItems,
    required this.isShopOpen,
    required this.onShopStatusChanged,
  });

  @override
  Widget build(BuildContext context) {
    final currentRoute = ModalRoute.of(context)?.settings.name;
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.mode == ThemeMode.dark;

    return Drawer(
      backgroundColor: isDark ? AppColors.backgroundPrimary : Colors.white,
      child: Column(
        children: [
          const AppSideNavLogo(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.backgroundSecondary
                        : AppColors.primaryBlue.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isShopOpen
                          ? AppColors.success.withValues(alpha: 0.35)
                          : AppColors.warning.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.storefront_rounded,
                        size: 18,
                        color: isShopOpen ? AppColors.success : AppColors.warning,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Shop Status',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isShopOpen ? 'Open' : 'Closed',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isShopOpen
                                    ? AppColors.success
                                    : AppColors.warning,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: isShopOpen,
                        onChanged: onShopStatusChanged,
                        activeThumbColor: AppColors.success,
                        activeTrackColor: AppColors.success.withValues(alpha: 0.3),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                ...filteredItems.map((item) {
                  final bool isActive = currentRoute == item.route;
                  return Column(
                    children: [
                      if (item.route == '/merchant-profile') ...[
                        _MerchantNavTile(
                          icon: isDark
                              ? Icons.light_mode_rounded
                              : Icons.dark_mode_rounded,
                          label: isDark ? 'Light Mode' : 'Dark Mode',
                          isActive: false,
                          isDark: isDark,
                          onTap: themeProvider.toggleTheme,
                        ),
                        const SizedBox(height: 8),
                      ],
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: _MerchantNavTile(
                          icon: item.icon,
                          label: item.label,
                          isActive: isActive,
                          isDark: isDark,
                          onTap: () {
                            Navigator.pop(context); // Close drawer
                            if (currentRoute != item.route) {
                              Navigator.pushReplacementNamed(context, item.route);
                            }
                          },
                        ),
                      ),
                    ],
                  );
                }),
                if (!filteredItems.any((item) => item.route == '/merchant-profile'))
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: _MerchantNavTile(
                      icon: isDark
                          ? Icons.light_mode_rounded
                          : Icons.dark_mode_rounded,
                      label: isDark ? 'Light Mode' : 'Dark Mode',
                      isActive: false,
                      isDark: isDark,
                      onTap: themeProvider.toggleTheme,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class MerchantBottomNav extends StatelessWidget {
  final int currentIndex;
  final List<MerchantNavItem> filteredItems;

  const MerchantBottomNav({
    super.key,
    required this.currentIndex,
    required this.filteredItems,
  });

  @override
  Widget build(BuildContext context) {
    // Determine which items to show in bottom nav.
    // Dashboard, Orders, Stock, Feedback, Profile are usually the most important.

    final List<MerchantNavItem> bottomNavItems = [
      filteredItems.firstWhere((i) => i.label == 'Orders'),
      filteredItems.firstWhere((i) => i.label == 'Dashboard'),
      filteredItems.firstWhere((i) => i.label == 'Profile'),
    ];

    final displayItems = bottomNavItems;

    // Find if the current route is in our display items
    final currentRoute = ModalRoute.of(context)?.settings.name;
    int effectiveIndex = displayItems.indexWhere(
      (item) => item.route == currentRoute,
    );

    // If not in display items, don't highlight any or default to 0 if we must
    // But since it's a BottomNavigationBar, we need a valid index.
    // If we're on a page not in bottom nav (like Services or Vehicles),
    // we could show no highlight or just default to Dashboard.
    final bool isCurrentRouteInBottomNav = effectiveIndex >= 0;
    if (!isCurrentRouteInBottomNav) {
      effectiveIndex = 0; // Default to Dashboard if on a hidden tab
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderColor : Colors.grey[200]!,
          ),
        ),
      ),
      child: BottomNavigationBar(
        currentIndex: effectiveIndex,
        onTap: (index) {
          final String route = displayItems[index].route;
          final currentRoute = ModalRoute.of(context)?.settings.name;
          if (currentRoute != route) {
            Navigator.pushReplacementNamed(context, route);
          }
        },
        type: BottomNavigationBarType.fixed,
        backgroundColor: isDark ? AppColors.backgroundSecondary : Colors.white,
        selectedItemColor: isCurrentRouteInBottomNav
            ? (isDark ? AppColors.primaryBlue : Colors.deepPurple)
            : Colors.grey[600],
        unselectedItemColor: Colors.grey[600],
        selectedLabelStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 12),
        elevation: 0,
        items: displayItems.map((item) {
          return BottomNavigationBarItem(
            icon: Icon(item.icon),
            label: item.label,
            activeIcon: Icon(
              item.icon,
              color: isDark ? AppColors.primaryBlue : Colors.deepPurple,
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _MerchantNavTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final bool isDark;
  final VoidCallback onTap;

  const _MerchantNavTile({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isActive
            ? (isDark ? AppColors.primaryBlue : const Color(0xFF2563EB))
            : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isActive
              ? Colors.white
              : (isDark ? Colors.grey[400] : const Color(0xFF4B5563)),
        ),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isActive
                ? Colors.white
                : (isDark ? Colors.grey[300] : const Color(0xFF374151)),
            fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
        visualDensity: const VisualDensity(horizontal: -1, vertical: -2),
        onTap: onTap,
      ),
    );
  }
}
