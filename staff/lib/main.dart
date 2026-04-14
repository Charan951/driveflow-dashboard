import 'package:flutter/material.dart';
import 'dart:convert' as dart_convert;
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'core/storage.dart';
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
import 'pages/merchant/merchant_stock_page.dart';
import 'pages/merchant/merchant_feedback_page.dart';
import 'pages/merchant/merchant_profile_page.dart';
import 'pages/merchant/merchant_services_page.dart';
import 'pages/merchant/merchant_vehicles_page.dart';
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

  // Global socket listener for role updates
  SocketService().addListener(() {
    final event = SocketService().value;
    if (event != null && event.startsWith('role_updated:')) {
      try {
        final payloadStr = event.substring('role_updated:'.length);
        final data =
            dart_convert.jsonDecode(payloadStr) as Map<String, dynamic>;

        AppStorage().getUserJson().then((jsonStr) {
          if (jsonStr != null && jsonStr.isNotEmpty) {
            final userMap =
                dart_convert.jsonDecode(jsonStr) as Map<String, dynamic>;
            userMap['role'] = data['role'] ?? userMap['role'];
            userMap['subRole'] = data['subRole'] ?? userMap['subRole'];
            userMap['status'] = data['status'] ?? userMap['status'];

            AppStorage().setUserJson(dart_convert.jsonEncode(userMap)).then((
              _,
            ) {
              // Optionally navigate based on new role
              if (rootNavigatorKey.currentContext != null) {
                final role = userMap['role']?.toString().toLowerCase();
                if (role == 'merchant') {
                  rootNavigatorKey.currentState?.pushNamedAndRemoveUntil(
                    '/merchant-dashboard',
                    (route) => false,
                  );
                } else if (role == 'staff') {
                  rootNavigatorKey.currentState?.pushNamedAndRemoveUntil(
                    '/home',
                    (route) => false,
                  );
                } else {
                  // Fallback or customer logout
                  AppStorage().clearToken();
                  AppStorage().clearUser();
                  rootNavigatorKey.currentState?.pushNamedAndRemoveUntil(
                    '/login',
                    (route) => false,
                  );
                }
              }
            });
          }
        });
      } catch (e) {
        // Ignore
      }
    }
  });

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
        '/merchant-stock': (context) => const MerchantStockPage(),
        '/merchant-feedback': (context) => const MerchantFeedbackPage(),
        '/merchant-services': (context) => const MerchantServicesPage(),
        '/merchant-vehicles': (context) => const MerchantVehiclesPage(),
        '/merchant-users': (context) =>
            const MerchantPlaceholderPage(title: 'Users'),
        '/merchant-profile': (context) => const MerchantProfilePage(),
        '/order': (context) => const StaffOrderDetailPage(),
      },
    );
  }
}
