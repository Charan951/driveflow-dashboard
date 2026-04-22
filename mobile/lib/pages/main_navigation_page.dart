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

class _MainNavigationPageState extends State<MainNavigationPage> with WidgetsBindingObserver {
  DateTime? _lastBackPress;
  PageController? _pageController;
  NavigationProvider? _navProvider;

  final List<Widget> _pages = const [
    BookServiceFlowPage(key: ValueKey('services'), initialCategory: 'Periodic'),
    BookServiceFlowPage(key: ValueKey('insurance'), initialCategory: 'Insurance'),
    CarzziDashboard(),
    BookServiceFlowPage(key: ValueKey('car-wash'), initialCategory: 'Wash'),
    BookServiceFlowPage(key: ValueKey('tires'), initialCategory: 'Tyres'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _navProvider = context.read<NavigationProvider>();
    _pageController = PageController(initialPage: _navProvider!.selectedIndex);
    _navProvider!.addListener(_onNavChanged);
  }

  @override
  void dispose() {
    _navProvider?.removeListener(_onNavChanged);
    _pageController?.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _onNavChanged() {
    if (_pageController != null &&
        _pageController!.hasClients &&
        _pageController!.page?.round() != _navProvider!.selectedIndex) {
      _pageController!.animateToPage(
        _navProvider!.selectedIndex,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutQuart,
      );
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      SocketService().init();
    }
  }

  Future<bool> _onWillPop() async {
    final selectedIndex = context.select<NavigationProvider, int>((n) => n.selectedIndex);

    if (selectedIndex != 2) {
      _navProvider?.setTab(2);
      return false;
    }

    final now = DateTime.now();
    if (_lastBackPress == null || now.difference(_lastBackPress!) > const Duration(seconds: 2)) {
      _lastBackPress = now;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Press back again to exit'),
          duration: Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return false;
    }
    await SystemNavigator.pop();
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = context.select<NavigationProvider, int>((n) => n.selectedIndex);
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await _onWillPop();
        if (shouldPop && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        extendBody: true,
        drawer: const CustomerDrawer(currentRouteName: '/customer'),
        body: PageView(
          controller: _pageController,
          physics: const NeverScrollableScrollPhysics(),
          onPageChanged: (index) {
            if (index != _navProvider?.selectedIndex) {
              _navProvider?.setTab(index);
            }
          },
          children: _pages,
        ),
        bottomNavigationBar: Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, 12 + bottomInset),
          child: PillBottomBar(
            selectedIndex: selectedIndex,
            onTap: (index) => _navProvider?.setTab(index),
          ),
        ),
      ),
    );
  }
}