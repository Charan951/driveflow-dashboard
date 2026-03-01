import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
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
      if (ModalRoute.of(context)?.settings.name != '/customer') {
        Navigator.of(
          context,
        ).pushNamedAndRemoveUntil('/customer', (route) => false);
      }
    } else {
      Navigator.of(
        context,
      ).pushReplacementNamed(routeName, arguments: arguments);
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
      label: 'Services',
      routeName: '/services',
    ),
    _DrawerItem(
      icon: Icons.add_task_outlined,
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
      icon: Icons.description_outlined,
      label: 'Documents',
      routeName: '/documents',
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
      routeName: 'url:https://car.speshwayhrms.com/privacy',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.mode == ThemeMode.dark;

    final topDark = const Color(0xFF020617);
    final bgGradient = isDark
        ? LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [topDark, const Color(0xFF020617)],
          )
        : const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.white, Colors.white],
          );

    return Drawer(
      width: 288,
      child: Container(
        decoration: BoxDecoration(gradient: bgGradient),
        child: SafeArea(
          child: Column(
            children: [
              SizedBox(
                height: 76,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF3B82F6), Color(0xFF22D3EE)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(
                                0xFF3B82F6,
                              ).withValues(alpha: isDark ? 0.28 : 0.16),
                              blurRadius: 12,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.directions_car_filled,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'VehicleCare',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Customer',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.7)
                                    : const Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.10)
                              : Colors.black.withValues(alpha: 0.04),
                        ),
                        child: IconButton(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: Icon(
                            Icons.close_rounded,
                            color: isDark
                                ? Colors.white
                                : const Color(0xFF0F172A),
                          ),
                          tooltip: 'Close',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  children: [
                    Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.white.withValues(alpha: 0.80),
                        border: Border.all(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.12)
                              : Colors.black.withValues(alpha: 0.04),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isDark ? Icons.dark_mode : Icons.light_mode,
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.9)
                                : const Color(0xFF0F172A),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Dark mode',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.9)
                                    : const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          Switch(
                            value: isDark,
                            onChanged: (_) => themeProvider.toggleTheme(),
                          ),
                        ],
                      ),
                    ),
                    for (final item in _drawerItems)
                      _DrawerTile(
                        icon: item.icon,
                        label: item.label,
                        active: _isActive(item.routeName),
                        onTap: () => _navigate(
                          context,
                          routeName: item.routeName,
                          arguments: item.arguments,
                        ),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                child: Builder(
                  builder: (context) {
                    final isDark =
                        Theme.of(context).brightness == Brightness.dark;
                    final primary = scheme.primary;
                    final secondary = scheme.secondary;
                    final topColor = isDark
                        ? primary.withValues(alpha: 0.22)
                        : Color.lerp(
                            primary.withValues(alpha: 0.26),
                            secondary.withValues(alpha: 0.22),
                            0.5,
                          )!;
                    final bottomColor = isDark
                        ? primary.withValues(alpha: 0.05)
                        : secondary.withValues(alpha: 0.12);

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        gradient: LinearGradient(
                          colors: [topColor, bottomColor],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        border: Border.all(
                          color: primary.withValues(
                            alpha: isDark ? 0.22 : 0.28,
                          ),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: primary.withValues(
                              alpha: isDark ? 0.12 : 0.16,
                            ),
                            blurRadius: 12,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white.withValues(alpha: 0.16),
                                ),
                                child: Icon(
                                  Icons.help_outline,
                                  color: scheme.primary,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Need Help?',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      "We're here 24/7",
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.black54,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: () =>
                                _navigate(context, routeName: '/support'),
                            child: const Text('Contact Support'),
                          ),
                        ],
                      ),
                    );
                  },
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
  final VoidCallback onTap;

  const _DrawerTile({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: active
                  ? LinearGradient(
                      colors: [
                        scheme.primary.withValues(alpha: 0.96),
                        scheme.primary.withValues(alpha: 0.78),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              color: active
                  ? null
                  : (isDark
                        ? Colors.white.withValues(alpha: 0.04)
                        : Colors.white),
              boxShadow: active
                  ? [
                      BoxShadow(
                        color: scheme.primary.withValues(alpha: 0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ]
                  : null,
              border: active
                  ? null
                  : Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.10)
                          : Colors.black.withValues(alpha: 0.04),
                    ),
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: active
                      ? scheme.onPrimary
                      : (isDark
                            ? Colors.white.withValues(alpha: 0.80)
                            : Colors.black54),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: active
                          ? scheme.onPrimary
                          : (isDark
                                ? Colors.white.withValues(alpha: 0.92)
                                : Colors.black87),
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
