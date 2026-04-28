import 'package:flutter/material.dart';
import 'dart:convert' as dart_convert;
import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'core/storage.dart';
import 'core/app_colors.dart';
import 'state/theme_provider.dart';
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

  final themeProvider = ThemeProvider();

  runApp(
    MultiProvider(
      providers: [ChangeNotifierProvider.value(value: themeProvider)],
      child: const StaffApp(),
    ),
  );

  unawaited(_bootstrapApp(themeProvider));
}

Future<void> _bootstrapApp(ThemeProvider themeProvider) async {
  // Initialize Firebase
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  await Future.wait([
    themeProvider.loadThemeMode(),
    BackgroundTracking.configure(),
    SocketService().init(),
    NotificationService().initialize(),
  ]);

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
                } else if (role == 'staff' || role == 'admin') {
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
}

class SmoothPageTransitionsBuilder extends PageTransitionsBuilder {
  const SmoothPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return FadeTransition(
      opacity: CurvedAnimation(parent: animation, curve: Curves.easeOutQuart),
      child: child,
    );
  }
}

class StaffApp extends StatelessWidget {
  const StaffApp({super.key});

  @override
  Widget build(BuildContext context) {
    final mode = context.watch<ThemeProvider>().mode;

    return MaterialApp(
      navigatorKey: rootNavigatorKey,
      title: 'Speshway Staff',
      debugShowCheckedModeBanner: false,
      themeMode: mode,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryBlue,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: AppColors.backgroundPrimaryLight,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.backgroundPrimaryLight,
          surfaceTintColor: AppColors.backgroundPrimaryLight,
        ),
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: SmoothPageTransitionsBuilder(),
            TargetPlatform.iOS: SmoothPageTransitionsBuilder(),
            TargetPlatform.linux: SmoothPageTransitionsBuilder(),
            TargetPlatform.macOS: SmoothPageTransitionsBuilder(),
            TargetPlatform.windows: SmoothPageTransitionsBuilder(),
          },
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.grey[50],
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey[300]!),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey[200]!),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: AppColors.primaryBlue,
              width: 2,
            ),
          ),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primaryBlue,
          onPrimary: AppColors.textPrimary,
          secondary: AppColors.primaryBlueSoft,
          onSecondary: AppColors.textPrimary,
          surface: AppColors.backgroundSecondary,
          onSurface: AppColors.textPrimary,
          error: AppColors.error,
          onError: AppColors.textPrimary,
        ),
        scaffoldBackgroundColor: AppColors.backgroundPrimary,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.backgroundPrimary,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
          iconTheme: IconThemeData(color: AppColors.textPrimary),
        ),
        textTheme: const TextTheme(
          titleLarge: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
          titleMedium: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          bodyLarge: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
            fontWeight: FontWeight.normal,
          ),
          bodyMedium: TextStyle(
            color: AppColors.textMuted,
            fontSize: 12,
            fontWeight: FontWeight.normal,
          ),
        ),
        cardTheme: CardThemeData(
          color: AppColors.backgroundSecondary,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.borderColor),
          ),
        ),
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: SmoothPageTransitionsBuilder(),
            TargetPlatform.iOS: SmoothPageTransitionsBuilder(),
            TargetPlatform.linux: SmoothPageTransitionsBuilder(),
            TargetPlatform.macOS: SmoothPageTransitionsBuilder(),
            TargetPlatform.windows: SmoothPageTransitionsBuilder(),
          },
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.backgroundSecondary,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.borderColor),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.borderColor),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: AppColors.primaryBlue,
              width: 2,
            ),
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
