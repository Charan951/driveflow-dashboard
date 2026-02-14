import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/customer_drawer.dart';
import '../widgets/pill_bottom_bar.dart';
import '../state/navigation_provider.dart';
import 'customer_dashboard_page.dart';
import 'my_vehicles_page.dart';
import 'service_list_page.dart';
import 'my_bookings_page.dart';
import 'profile_page.dart';

class MainNavigationPage extends StatefulWidget {
  const MainNavigationPage({super.key});

  @override
  State<MainNavigationPage> createState() => _MainNavigationPageState();
}

class _MainNavigationPageState extends State<MainNavigationPage> {
  final List<Widget> _pages = const [
    MyVehiclesPage(),
    ServiceListPage(),
    CustomerDashboardPage(),
    MyBookingsPage(),
    ProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    final navProvider = context.watch<NavigationProvider>();
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      extendBody: true,
      drawer: const CustomerDrawer(currentRouteName: '/customer'),
      body: IndexedStack(index: navProvider.selectedIndex, children: _pages),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 12 + bottomInset),
        child: ConstrainedBox(
          constraints: const BoxConstraints.tightFor(height: 72),
          child: PillBottomBar(
            selectedIndex: navProvider.selectedIndex,
            onTap: (index) => navProvider.setTab(index),
          ),
        ),
      ),
    );
  }
}
