import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/app_colors.dart';
import '../core/app_styles.dart';
import '../state/navigation_provider.dart';
import '../state/theme_provider.dart';

class CustomerDrawer extends StatefulWidget {
  final String? currentRouteName;

  const CustomerDrawer({super.key, required this.currentRouteName});

  @override
  State<CustomerDrawer> createState() => _CustomerDrawerState();
}

class _CustomerDrawerState extends State<CustomerDrawer> {
  bool _isActive(String routeName) => widget.currentRouteName == routeName;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _navigate(
    BuildContext context, {
    required String routeName,
    Object? arguments,
  }) async {
    if (_isActive(routeName)) {
      Navigator.of(context).pop();
      return;
    }

    if (routeName.startsWith('url:')) {
      final url = routeName.substring(4);
      if (await canLaunchUrl(Uri.parse(url))) {
        await launchUrl(Uri.parse(url));
      }
      return;
    }

    Navigator.of(context).pop();

    final navProvider = context.read<NavigationProvider>();
    if (NavigationProvider.routeToTabIndex.containsKey(routeName)) {
      navProvider.navigateTo(
        routeName,
        arguments: arguments as Map<String, dynamic>?,
      );
      if (widget.currentRouteName != '/customer') {
        Navigator.of(
          context,
        ).pushNamedAndRemoveUntil('/customer', (route) => false);
      }
    } else {
      // If we are on the dashboard, push the new route so we can come back
      if (widget.currentRouteName == '/customer') {
        Navigator.of(context).pushNamed(routeName, arguments: arguments);
      } else {
        // If we are already on a non-dashboard page, replace it
        Navigator.of(
          context,
        ).pushReplacementNamed(routeName, arguments: arguments);
      }
    }
  }

  static const List<_DrawerItem> _drawerItems = [
    _DrawerItem(
      icon: Icons.dashboard_outlined,
      label: 'Dashboard',
      routeName: '/customer',
    ),
    _DrawerItem(
      icon: Icons.calendar_month_outlined,
      label: 'My Bookings',
      routeName: '/bookings',
    ),
    _DrawerItem(
      icon: Icons.payments_outlined,
      label: 'My Payments',
      routeName: '/payments',
    ),
    _DrawerItem(
      icon: Icons.directions_car_filled_outlined,
      label: 'My Vehicles',
      routeName: '/vehicles',
    ),
    _DrawerItem(
      icon: Icons.settings_suggest_outlined,
      label: 'Book Service',
      routeName: '/services',
      arguments: {'openBookHint': true},
    ),
    _DrawerItem(
      icon: Icons.local_car_wash_outlined,
      label: 'Car Wash',
      routeName: '/car-wash',
    ),
    _DrawerItem(
      icon: Icons.battery_charging_full_outlined,
      label: 'Tires & Battery',
      routeName: '/tires',
    ),
    _DrawerItem(
      icon: Icons.shield_outlined,
      label: 'Insurance',
      routeName: '/insurance',
    ),
    _DrawerItem(
      icon: Icons.support_agent_outlined,
      label: 'Support',
      routeName: '/support',
    ),
    _DrawerItem(
      icon: Icons.person_outline,
      label: 'Profile',
      routeName: '/profile',
    ),
    _DrawerItem(
      icon: Icons.privacy_tip_outlined,
      label: 'Privacy Policy',
      routeName: 'url:https://carzzi.com/privacy',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.mode == ThemeMode.dark;

    return Drawer(
      width: 320,
      backgroundColor: isDark ? AppColors.backgroundPrimary : Colors.white,
      child: SafeArea(
        child: RepaintBoundary(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: 20,
                  horizontal: 8,
                ),
                child: Image.asset(
                  'assets/carzzilogo.png',
                  width: double.infinity,
                  fit: BoxFit.contain,
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  children: [
                    for (final item in _drawerItems)
                      _DrawerTile(
                        icon: item.icon,
                        label: item.label,
                        active: _isActive(item.routeName),
                        isDark: isDark,
                        onTap: () => _navigate(
                          context,
                          routeName: item.routeName,
                          arguments: item.arguments,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DrawerItem {
  final IconData icon;
  final String label;
  final String routeName;
  final Object? arguments;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.routeName,
    this.arguments,
  });
}

class _DrawerTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final bool isDark;
  final VoidCallback onTap;

  const _DrawerTile({
    required this.icon,
    required this.label,
    required this.active,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: active ? AppStyles.primaryGradient : null,
              color: active ? null : Colors.transparent,
              boxShadow: active
                  ? [
                      BoxShadow(
                        color: AppColors.primaryBlue.withValues(alpha: 0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 22,
                  color: active
                      ? AppColors.textPrimary
                      : (isDark ? AppColors.textSecondary : Colors.black54),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                      color: active
                          ? AppColors.textPrimary
                          : (isDark ? AppColors.textSecondary : Colors.black87),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
