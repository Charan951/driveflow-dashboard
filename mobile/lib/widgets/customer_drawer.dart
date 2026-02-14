import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/navigation_provider.dart';

class CustomerDrawer extends StatelessWidget {
  final String? currentRouteName;

  const CustomerDrawer({super.key, required this.currentRouteName});

  bool _isActive(String routeName) => currentRouteName == routeName;

  Future<void> _navigate(
    BuildContext context, {
    required String routeName,
    Object? arguments,
  }) async {
    if (_isActive(routeName)) {
      Navigator.of(context).pop();
      return;
    }
    Navigator.of(context).pop();

    final navProvider = context.read<NavigationProvider>();
    if (NavigationProvider.routeToTabIndex.containsKey(routeName)) {
      navProvider.navigateTo(
        routeName,
        arguments: arguments as Map<String, dynamic>?,
      );
      // If we are already on the MainNavigationPage, we don't need to push it
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

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final items = <_DrawerItem>[
      const _DrawerItem(
        icon: Icons.dashboard_outlined,
        label: 'Dashboard',
        routeName: '/customer',
      ),
      const _DrawerItem(
        icon: Icons.calendar_month_outlined,
        label: 'My Bookings',
        routeName: '/bookings',
      ),
      const _DrawerItem(
        icon: Icons.payments_outlined,
        label: 'My Payments',
        routeName: '/payments',
      ),
      const _DrawerItem(
        icon: Icons.directions_car_filled_outlined,
        label: 'My Vehicles',
        routeName: '/vehicles',
      ),
      const _DrawerItem(
        icon: Icons.settings_suggest_outlined,
        label: 'Services',
        routeName: '/services',
      ),
      const _DrawerItem(
        icon: Icons.add_task_outlined,
        label: 'Book Service',
        routeName: '/services',
        arguments: {'openBookHint': true},
      ),
      const _DrawerItem(
        icon: Icons.local_car_wash_outlined,
        label: 'Car Wash',
        routeName: '/services',
        arguments: {'filter': 'car_wash', 'title': 'Car Wash'},
      ),
      const _DrawerItem(
        icon: Icons.battery_charging_full_outlined,
        label: 'Tires & Battery',
        routeName: '/services',
        arguments: {'filter': 'tires_battery', 'title': 'Tires & Battery'},
      ),
      const _DrawerItem(
        icon: Icons.shield_outlined,
        label: 'Insurance',
        routeName: '/insurance',
      ),
      const _DrawerItem(
        icon: Icons.description_outlined,
        label: 'Documents',
        routeName: '/documents',
      ),
      const _DrawerItem(
        icon: Icons.support_agent_outlined,
        label: 'Support',
        routeName: '/support',
      ),
      const _DrawerItem(
        icon: Icons.person_outline,
        label: 'Profile',
        routeName: '/profile',
      ),
    ];

    return Drawer(
      width: 288,
      child: SafeArea(
        child: Column(
          children: [
            SizedBox(
              height: 64,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        gradient: LinearGradient(
                          colors: [scheme.primary, scheme.primaryContainer],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Icon(
                        Icons.directions_car_filled,
                        color: scheme.onPrimary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'VehicleCare',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close),
                      tooltip: 'Close',
                    ),
                  ],
                ),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                children: [
                  for (final item in items)
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
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: scheme.primary.withValues(alpha: 0.12),
                  ),
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
                            color: scheme.primary.withValues(alpha: 0.12),
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
                                style: TextStyle(fontWeight: FontWeight.w800),
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
              ),
            ),
          ],
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

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: active ? scheme.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: active ? scheme.onPrimary : Colors.black54,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: active ? scheme.onPrimary : Colors.black87,
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
