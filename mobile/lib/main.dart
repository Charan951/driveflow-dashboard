import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'pages/splash_page.dart';
import 'pages/login_page.dart';
import 'pages/register_page.dart';
import 'pages/track_booking_page.dart';
import 'pages/my_payments_page.dart';
import 'pages/documents_page.dart';
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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  final authProvider = AuthProvider();
  final themeProvider = ThemeProvider();
  final trackingProvider = TrackingProvider();

  // Precache the logo immediately for a faster splash experience
  final imageProvider = const AssetImage('assets/appicon.png');

  await Future.wait([authProvider.loadMe(), themeProvider.loadThemeMode()]);

  final socketService = SocketService();
  socketService.setTrackingProvider(trackingProvider);
  final notificationService = NotificationService();
  await notificationService.initialize();

  if (authProvider.isAuthenticated) {
    socketService.init(authProvider.user);
    notificationService.syncToken();
    trackingProvider.init(authProvider.user?.role, authProvider.user?.id);
  }

  runApp(
    MyApp(
      authProvider: authProvider,
      themeProvider: themeProvider,
      socketService: socketService,
      notificationService: notificationService,
      trackingProvider: trackingProvider,
      precachedLogo: imageProvider,
    ),
  );
}

class NoAnimationPageTransitionsBuilder extends PageTransitionsBuilder {
  const NoAnimationPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // Keep animations for splash, register, and login
    final name = route.settings.name;
    if (name == '/splash' ||
        name == '/login' ||
        name == '/register' ||
        name == '/') {
      return FadeUpwardsPageTransitionsBuilder().buildTransitions(
        route,
        context,
        animation,
        secondaryAnimation,
        child,
      );
    }
    return child;
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
            themeAnimationDuration: Duration.zero,
            builder: (context, child) {
              return child ?? const SizedBox.shrink();
            },
            theme: ThemeData(
              useMaterial3: true,
              colorScheme: ColorScheme.fromSeed(
                seedColor: Colors.blue,
                brightness: Brightness.light,
              ),
              scaffoldBackgroundColor: Colors.white,
              appBarTheme: const AppBarTheme(
                backgroundColor: Colors.white,
                surfaceTintColor: Colors.white,
              ),
              pageTransitionsTheme: const PageTransitionsTheme(
                builders: {
                  TargetPlatform.android: NoAnimationPageTransitionsBuilder(),
                  TargetPlatform.iOS: NoAnimationPageTransitionsBuilder(),
                  TargetPlatform.linux: NoAnimationPageTransitionsBuilder(),
                  TargetPlatform.macOS: NoAnimationPageTransitionsBuilder(),
                  TargetPlatform.windows: NoAnimationPageTransitionsBuilder(),
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
                  TargetPlatform.android: NoAnimationPageTransitionsBuilder(),
                  TargetPlatform.iOS: NoAnimationPageTransitionsBuilder(),
                  TargetPlatform.linux: NoAnimationPageTransitionsBuilder(),
                  TargetPlatform.macOS: NoAnimationPageTransitionsBuilder(),
                  TargetPlatform.windows: NoAnimationPageTransitionsBuilder(),
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
              '/insurance': (_) => const _TabRedirect(index: 1),
              '/documents': (_) => const DocumentsPage(),
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
    // 3 seconds delay for splash screen when authenticated
    Future.delayed(const Duration(seconds: 3), () {
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
