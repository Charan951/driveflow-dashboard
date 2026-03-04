import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'services/background_tracking.dart';
import 'services/socket_service.dart';
import 'services/notification_service.dart';

import 'pages/home_page.dart';
import 'pages/login_page.dart';
import 'pages/order_detail_page.dart';
import 'pages/splash_page.dart';
import 'pages/merchant/merchant_dashboard.dart';
import 'pages/merchant/merchant_orders_page.dart';
import 'pages/merchant/merchant_order_detail_page.dart';
import 'pages/merchant/merchant_placeholder.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  await BackgroundTracking.configure();
  await SocketService().init();

  // Initialize Notifications
  await NotificationService().initialize();

  runApp(const StaffApp());
}

class StaffApp extends StatelessWidget {
  const StaffApp({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(seedColor: Colors.deepPurple);
    return MaterialApp(
      navigatorKey: rootNavigatorKey,
      title: 'Speshway Staff',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
        ),
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
            TargetPlatform.linux: FadeUpwardsPageTransitionsBuilder(),
            TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
            TargetPlatform.windows: FadeUpwardsPageTransitionsBuilder(),
          },
        ),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(14)),
          ),
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashPage(),
        '/login': (context) => const StaffLoginPage(),
        '/home': (context) => const StaffHomePage(),
        '/merchant-dashboard': (context) => const MerchantDashboardPage(),
        '/merchant-orders': (context) => const MerchantOrdersPage(),
        '/merchant-order-detail': (context) => const MerchantOrderDetailPage(),
        '/merchant-stock': (context) =>
            const MerchantPlaceholderPage(title: 'Stock'),
        '/merchant-feedback': (context) =>
            const MerchantPlaceholderPage(title: 'Feedback'),
        '/merchant-services': (context) =>
            const MerchantPlaceholderPage(title: 'Services'),
        '/merchant-vehicles': (context) =>
            const MerchantPlaceholderPage(title: 'Vehicles'),
        '/merchant-users': (context) =>
            const MerchantPlaceholderPage(title: 'Users'),
        '/merchant-profile': (context) =>
            const MerchantPlaceholderPage(title: 'Profile'),
        '/order': (context) => const StaffOrderDetailPage(),
      },
    );
  }
}
