import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../widgets/customer_drawer.dart';
import '../widgets/pill_bottom_bar.dart';
import '../state/navigation_provider.dart';
import '../services/socket_service.dart';
import 'book_service_flow_page.dart';
import 'speshway_vehiclecare_dashboard_page.dart';

class MainNavigationPage extends StatefulWidget {
  const MainNavigationPage({super.key});

  @override
  State<MainNavigationPage> createState() => _MainNavigationPageState();
}

class _MainNavigationPageState extends State<MainNavigationPage>
    with WidgetsBindingObserver {
  final List<Widget> _pages = const [
    BookServiceFlowPage(key: ValueKey('services'), initialCategory: 'Periodic'),
    BookServiceFlowPage(
      key: ValueKey('insurance'),
      initialCategory: 'Insurance',
    ),
    SpeshwayVehicleCareDashboard(),
    BookServiceFlowPage(key: ValueKey('car-wash'), initialCategory: 'Wash'),
    BookServiceFlowPage(key: ValueKey('tires'), initialCategory: 'Tyres'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Re-initialize socket if needed when app comes back to foreground
      SocketService().init();
    }
  }

  @override
  Widget build(BuildContext context) {
    final navProvider = context.watch<NavigationProvider>();
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        SystemNavigator.pop();
      },
      child: Scaffold(
        extendBody: true,
        drawer: const CustomerDrawer(currentRouteName: '/customer'),
        body: IndexedStack(index: navProvider.selectedIndex, children: _pages),
        bottomNavigationBar: Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, 12 + bottomInset),
          child: ConstrainedBox(
            constraints: const BoxConstraints.tightFor(height: 80),
            child: PillBottomBar(
              selectedIndex: navProvider.selectedIndex,
              onTap: (index) => navProvider.setTab(index),
            ),
          ),
        ),
      ),
    );
  }
}
