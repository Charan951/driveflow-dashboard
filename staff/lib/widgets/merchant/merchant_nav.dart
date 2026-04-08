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
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentRoute = ModalRoute.of(context)?.settings.name;
    final int currentIndex = _filteredItems.indexWhere(
      (item) => item.route == currentRoute,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: widget.actions,
      ),
      drawer: MerchantDrawer(filteredItems: _filteredItems),
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
  const MerchantDrawer({super.key, required this.filteredItems});

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
              children: filteredItems.map((item) {
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

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
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
        backgroundColor: Colors.white,
        selectedItemColor: isCurrentRouteInBottomNav
            ? Colors.deepPurple
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
            activeIcon: Icon(item.icon, color: Colors.deepPurple),
          );
        }).toList(),
      ),
    );
  }
}
