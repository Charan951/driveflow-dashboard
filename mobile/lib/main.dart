import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;
import 'dart:async';
import 'dart:ui';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'pages/splash_page.dart';
import 'pages/login_page.dart';
import 'pages/register_page.dart';
import 'pages/track_booking_page.dart';
import 'pages/my_payments_page.dart';
import 'pages/support_page.dart';
import 'pages/notifications_page.dart';
import 'pages/main_navigation_page.dart';
import 'pages/my_vehicles_page.dart';
import 'pages/add_vehicle_page.dart';
import 'pages/my_bookings_page.dart';
import 'pages/profile_page.dart';
import 'pages/speshway_vehiclecare_dashboard_page.dart';
import 'pages/book_service_flow_page.dart';
import 'services/socket_service.dart';
import 'services/notification_service.dart';
import 'state/auth_provider.dart';
import 'state/navigation_provider.dart';
import 'state/theme_provider.dart';
import 'state/tracking_provider.dart';
import 'core/app_colors.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

Future<void> initializeBackgroundService() async {
  final service = FlutterBackgroundService();

  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: true,
      isForegroundMode: true,
      notificationChannelId: 'high_importance_channel',
      initialNotificationTitle: 'Carzzi Service',
      initialNotificationContent: 'Running in background',
      foregroundServiceNotificationId: 888,
    ),
    iosConfiguration: IosConfiguration(
      autoStart: true,
      onForeground: onStart,
      onBackground: onIosBackground,
    ),
  );
  await service.startService();
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();

  if (service is AndroidServiceInstance) {
    service.on('setAsForeground').listen((event) {
      service.setAsForegroundService();
    });
    service.on('setAsBackground').listen((event) {
      service.setAsBackgroundService();
    });
  }
  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  // You can initialize your background services here, like socket or tracking
  Timer.periodic(const Duration(seconds: 1), (timer) async {
    // Keep alive logic or periodic tasks
  });
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final authProvider = AuthProvider();
  final themeProvider = ThemeProvider();
  final trackingProvider = TrackingProvider();
  final socketService = SocketService();
  socketService.setTrackingProvider(trackingProvider);
  final notificationService = NotificationService();

  // Mount UI first so iOS doesn't stay on a blank launch screen.
  runApp(
    MyApp(
      authProvider: authProvider,
      themeProvider: themeProvider,
      socketService: socketService,
      notificationService: notificationService,
      trackingProvider: trackingProvider,
      precachedLogo: const AssetImage('assets/carzzilogo_padded.png'),
    ),
  );

  unawaited(
    _bootstrapApp(
      authProvider: authProvider,
      themeProvider: themeProvider,
      trackingProvider: trackingProvider,
      socketService: socketService,
      notificationService: notificationService,
    ),
  );
}

Future<void> _bootstrapApp({
  required AuthProvider authProvider,
  required ThemeProvider themeProvider,
  required TrackingProvider trackingProvider,
  required SocketService socketService,
  required NotificationService notificationService,
}) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    ).timeout(const Duration(seconds: 15));
  } catch (e, stack) {
    debugPrint('Firebase init failed: $e');
    debugPrint(stack.toString());
  }

  try {
    await Future.wait([
      authProvider.loadMe().timeout(const Duration(seconds: 15)),
      themeProvider.loadThemeMode().timeout(const Duration(seconds: 10)),
    ]);
  } catch (e, stack) {
    debugPrint('Initial state load failed: $e');
    debugPrint(stack.toString());
  }

  try {
    await notificationService.initialize().timeout(const Duration(seconds: 15));
  } catch (e, stack) {
    debugPrint('Notification init failed: $e');
    debugPrint(stack.toString());
  }

  if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
    try {
      await initializeBackgroundService().timeout(const Duration(seconds: 15));
    } catch (e) {
      debugPrint('Failed to start background service: $e');
    }
  }

  if (authProvider.isAuthenticated) {
    socketService.init(authProvider.user);
    unawaited(notificationService.syncToken());
    trackingProvider.init(authProvider.user?.role, authProvider.user?.id);
  }
}

class StartupErrorApp extends StatelessWidget {
  final String error;

  const StartupErrorApp({super.key, required this.error});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Startup failed',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Check debug console for stack trace.',
                  style: TextStyle(color: Colors.white70),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: SingleChildScrollView(
                    child: Text(
                      error,
                      style: const TextStyle(
                        color: Colors.redAccent,
                        fontFamily: 'monospace',
                      ),
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
    // A fast but smooth fade transition for all pages
    return FadeTransition(
      opacity: CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
      child: child,
    );
  }
}

class MyApp extends StatelessWidget {
  static bool _precacheOnce = false;
  final AuthProvider authProvider;
  final ThemeProvider themeProvider;
  final SocketService socketService;
  final NotificationService notificationService;
  final TrackingProvider trackingProvider;
  final ImageProvider? precachedLogo;

  const MyApp({
    super.key,
    required this.authProvider,
    required this.themeProvider,
    required this.socketService,
    required this.notificationService,
    required this.trackingProvider,
    this.precachedLogo,
  });

  @override
  Widget build(BuildContext context) {
    if (precachedLogo != null && !_precacheOnce) {
      _precacheOnce = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        precacheImage(precachedLogo!, context).catchError((_) {});
      });
    }

    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),
        ChangeNotifierProvider(create: (_) => NavigationProvider()),
        ChangeNotifierProvider.value(value: themeProvider),
        ChangeNotifierProvider.value(value: socketService),
        ChangeNotifierProvider.value(value: trackingProvider),
        Provider.value(value: notificationService),
      ],
      child: Builder(
        builder: (context) {
          final mode = context.watch<ThemeProvider>().mode;

          return MaterialApp(
            navigatorKey: rootNavigatorKey,
            title: 'Carzzi',
            debugShowCheckedModeBanner: false,
            themeMode: mode,
            themeAnimationDuration: const Duration(milliseconds: 200),
            builder: (context, child) {
              return child ?? const SizedBox.shrink();
            },
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
              appBarTheme: AppBarTheme(
                backgroundColor: AppColors.backgroundPrimary,
                surfaceTintColor: Colors.transparent,
                elevation: 0,
                titleTextStyle: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                iconTheme: const IconThemeData(color: AppColors.textPrimary),
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
                displayLarge: TextStyle(color: AppColors.textPrimary),
                displayMedium: TextStyle(color: AppColors.textPrimary),
                displaySmall: TextStyle(color: AppColors.textPrimary),
                headlineLarge: TextStyle(color: AppColors.textPrimary),
                headlineMedium: TextStyle(color: AppColors.textPrimary),
                headlineSmall: TextStyle(color: AppColors.textPrimary),
                titleSmall: TextStyle(color: AppColors.textPrimary),
                bodySmall: TextStyle(color: AppColors.textPrimary),
                labelLarge: TextStyle(color: AppColors.textPrimary),
                labelMedium: TextStyle(color: AppColors.textPrimary),
                labelSmall: TextStyle(color: AppColors.textPrimary),
              ),
              cardTheme: CardThemeData(
                color: AppColors.backgroundSecondary,
                surfaceTintColor: Colors.transparent,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: AppColors.borderColor),
                ),
                margin: EdgeInsets.zero,
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  foregroundColor: AppColors.textPrimary,
                  backgroundColor: Colors.transparent,
                  shadowColor: AppColors.primaryBlue.withValues(alpha: 0.15),
                  elevation: 8,
                ),
              ),
              bottomNavigationBarTheme: BottomNavigationBarThemeData(
                backgroundColor: AppColors.backgroundSecondary,
                selectedItemColor: AppColors.primaryBlue,
                unselectedItemColor: AppColors.textMuted,
                elevation: 0,
                type: BottomNavigationBarType.fixed,
                selectedLabelStyle: const TextStyle(fontSize: 12),
                unselectedLabelStyle: const TextStyle(fontSize: 12),
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
            ),
            initialRoute: '/',
            routes: {
              '/': (_) => const RootGate(),
              '/splash': (_) => const SplashPage(),
              '/login': (_) => const LoginPage(),
              '/register': (_) => const RegisterPage(),
              '/services': (_) => const _TabRedirect(index: 0),
              '/customer': (_) => const MainNavigationPage(),
              '/bookings': (_) => const MyBookingsPage(),
              '/payments': (_) => const MyPaymentsPage(),
              '/vehicles': (_) => const MyVehiclesPage(),
              '/add-vehicle': (_) => const AddVehiclePage(),
              '/notifications': (_) => const NotificationsPage(),
              '/essentials': (_) => const _TabRedirect(index: 1),
              '/support': (_) => const SupportPage(),
              '/profile': (_) => const ProfilePage(),
              '/car-wash': (_) => const _TabRedirect(index: 3),
              '/tires': (_) => const _TabRedirect(index: 4),
              '/track': (_) => const TrackBookingPage(),
              '/book': (context) {
                final args = ModalRoute.of(context)?.settings.arguments;
                if (args is String) {
                  return BookServiceFlowPage(initialCategory: args);
                }
                return const BookServiceFlowPage();
              },
              '/carzzi-dashboard': (_) => const CarzziDashboard(),
              '/merchant': (_) => const MerchantHomePage(),
              '/staff': (_) => const StaffHomePage(),
              '/admin': (_) => const AdminHomePage(),
            },
            onGenerateRoute: (settings) {
              if (settings.name == '/auth') {
                return MaterialPageRoute(
                  builder: (_) => authProvider.isAuthenticated
                      ? const MainNavigationPage()
                      : const SplashPage(),
                  settings: const RouteSettings(name: '/'),
                );
              }
              return null;
            },
            onUnknownRoute: (settings) {
              return MaterialPageRoute(
                builder: (_) => authProvider.isAuthenticated
                    ? const MainNavigationPage()
                    : const SplashPage(),
                settings: const RouteSettings(name: '/'),
              );
            },
          );
        },
      ),
    );
  }
}

class _TabRedirect extends StatelessWidget {
  final int index;
  const _TabRedirect({required this.index});

  @override
  Widget build(BuildContext context) {
    // Use addPostFrameCallback to avoid calling notifyListeners during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final nav = context.read<NavigationProvider>();
      final args = ModalRoute.of(context)?.settings.arguments;
      nav.setTab(index, arguments: args);
    });
    return const MainNavigationPage();
  }
}

class RootGate extends StatefulWidget {
  const RootGate({super.key});

  @override
  State<RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<RootGate> {
  bool _splashDelayComplete = false;

  @override
  void initState() {
    super.initState();
    // 2 seconds delay for splash screen when authenticated
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _splashDelayComplete = true;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    // Wait until initialization is complete
    if (!auth.isInitialized) {
      return const SplashPage();
    }

    // If authenticated, show home pages only after 3 seconds splash delay
    if (auth.isAuthenticated) {
      if (!_splashDelayComplete) {
        return const SplashPage();
      }
      final role = auth.user?.role;
      if (role == 'merchant') return const MerchantHomePage();
      if (role == 'staff') return const StaffHomePage();
      if (role == 'admin') return const AdminHomePage();
      return const MainNavigationPage();
    }

    // If not authenticated, always show SplashPage (it will handle navigation to login)
    return const SplashPage();
  }
}

class MerchantHomePage extends StatelessWidget {
  const MerchantHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const _RoleHomeScaffold(title: 'Merchant Dashboard');
  }
}

class StaffHomePage extends StatelessWidget {
  const StaffHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const _RoleHomeScaffold(title: 'Staff Dashboard');
  }
}

class AdminHomePage extends StatelessWidget {
  const AdminHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const _RoleHomeScaffold(title: 'Admin Dashboard');
  }
}

class _RoleHomeScaffold extends StatelessWidget {
  final String title;

  const _RoleHomeScaffold({required this.title});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (!context.mounted) return;
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/login',
                (route) => false,
              );
            },
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  user != null ? 'Hi, ${user.name}' : 'Hi',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                if (user != null) ...[
                  Text(user.email, textAlign: TextAlign.center),
                  if (user.role != null && user.role!.isNotEmpty)
                    Text('Role: ${user.role}', textAlign: TextAlign.center),
                  if (user.subRole != null && user.subRole!.isNotEmpty)
                    Text(
                      'SubRole: ${user.subRole}',
                      textAlign: TextAlign.center,
                    ),
                ],
                const SizedBox(height: 24),
                const Text(
                  'This area is ready for role-specific features.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
