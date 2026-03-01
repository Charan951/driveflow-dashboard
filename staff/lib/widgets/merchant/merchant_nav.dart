import 'package:flutter/material.dart';
import '../../services/auth_service.dart';

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

const List<MerchantNavItem> merchantNavItems = [
  MerchantNavItem(
    icon: Icons.dashboard_outlined,
    label: 'Dashboard',
    route: '/merchant-dashboard',
  ),
  MerchantNavItem(
    icon: Icons.assignment_outlined,
    label: 'Orders',
    route: '/merchant-orders',
  ),
  MerchantNavItem(
    icon: Icons.layers_outlined,
    label: 'Stock',
    route: '/merchant-stock',
  ),
  MerchantNavItem(
    icon: Icons.message_outlined,
    label: 'Feedback',
    route: '/merchant-feedback',
  ),
  MerchantNavItem(
    icon: Icons.store_outlined,
    label: 'Services',
    route: '/merchant-services',
  ),
  MerchantNavItem(
    icon: Icons.directions_car_outlined,
    label: 'Vehicles',
    route: '/merchant-vehicles',
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

class MerchantScaffold extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final currentRoute = ModalRoute.of(context)?.settings.name;
    final int currentIndex = merchantNavItems.indexWhere(
      (item) => item.route == currentRoute,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: actions,
      ),
      drawer: const MerchantDrawer(),
      body: body,
      bottomNavigationBar: MerchantBottomNav(
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
      ),
      floatingActionButton: floatingActionButton,
    );
  }
}

class MerchantDrawer extends StatelessWidget {
  const MerchantDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthService authService = AuthService();
    final currentRoute = ModalRoute.of(context)?.settings.name;

    return Drawer(
      backgroundColor: Colors.white,
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.deepPurple[50],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.store,
                    color: Colors.deepPurple,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'Merchant Portal',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: merchantNavItems.map((item) {
                final bool isActive = currentRoute == item.route;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: ListTile(
                    leading: Icon(
                      item.icon,
                      color: isActive ? Colors.deepPurple : Colors.grey[600],
                    ),
                    title: Text(
                      item.label,
                      style: TextStyle(
                        fontWeight: isActive
                            ? FontWeight.bold
                            : FontWeight.w500,
                        color: isActive ? Colors.deepPurple : Colors.grey[800],
                      ),
                    ),
                    onTap: () {
                      Navigator.pop(context); // Close drawer
                      if (currentRoute != item.route) {
                        Navigator.pushReplacementNamed(context, item.route);
                      }
                    },
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    tileColor: isActive
                        ? Colors.deepPurple.withValues(alpha: 0.1)
                        : null,
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(12),
            child: ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text(
                'Logout',
                style: TextStyle(
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
              onTap: () async {
                await authService.logout();
                if (!context.mounted) return;
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/login',
                  (route) => false,
                );
              },
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MerchantBottomNav extends StatelessWidget {
  final int currentIndex;

  const MerchantBottomNav({super.key, required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    // We only show the first 5 items in the bottom nav to keep it clean
    // and match the React version's style.
    final List<MerchantNavItem> bottomNavItems = merchantNavItems
        .take(5)
        .toList();

    // If the current index is outside the first 5, we still want to show the correct icon
    // or just default to dashboard if not in the first 5.
    final int effectiveIndex = currentIndex < 5 ? currentIndex : 0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: BottomNavigationBar(
        currentIndex: effectiveIndex,
        onTap: (index) {
          final String route = bottomNavItems[index].route;
          final currentRoute = ModalRoute.of(context)?.settings.name;
          if (currentRoute != route) {
            Navigator.pushReplacementNamed(context, route);
          }
        },
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: Colors.deepPurple,
        unselectedItemColor: Colors.grey[600],
        selectedLabelStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 12),
        elevation: 0,
        items: bottomNavItems.map((item) {
          return BottomNavigationBarItem(
            icon: Icon(item.icon),
            label: item.label,
            activeIcon: Icon(item.icon, color: Colors.deepPurple),
          );
        }).toList(),
      ),
    );
  }
}
