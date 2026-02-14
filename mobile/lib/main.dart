import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'pages/splash_page.dart';
import 'pages/login_page.dart';
import 'pages/register_page.dart';
import 'pages/track_booking_page.dart';
import 'pages/my_payments_page.dart';
import 'pages/insurance_page.dart';
import 'pages/documents_page.dart';
import 'pages/support_page.dart';
import 'pages/main_navigation_page.dart';
import 'state/auth_provider.dart';
import 'state/navigation_provider.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NavigationProvider()),
      ],
      child: MaterialApp(
        title: 'App',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
          scaffoldBackgroundColor: Colors.white,
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.white,
          ),
        ),
        initialRoute: '/',
        routes: {
          '/': (_) => const SplashPage(),
          '/login': (_) => const LoginPage(),
          '/register': (_) => const RegisterPage(),
          '/services': (_) => const _TabRedirect(index: 1),
          '/customer': (_) => const MainNavigationPage(),
          '/bookings': (_) => const _TabRedirect(index: 3),
          '/payments': (_) => const MyPaymentsPage(),
          '/vehicles': (_) => const _TabRedirect(index: 0),
          '/insurance': (_) => const InsurancePage(),
          '/documents': (_) => const DocumentsPage(),
          '/support': (_) => const SupportPage(),
          '/profile': (_) => const _TabRedirect(index: 4),
          '/track': (_) => const TrackBookingPage(),
          '/merchant': (_) => const MerchantHomePage(),
          '/staff': (_) => const StaffHomePage(),
          '/admin': (_) => const AdminHomePage(),
        },
        onGenerateRoute: (settings) {
          if (settings.name == '/auth') {
            return MaterialPageRoute(
              builder: (_) => const SplashPage(),
              settings: const RouteSettings(name: '/'),
            );
          }
          return null;
        },
        onUnknownRoute: (settings) {
          return MaterialPageRoute(
            builder: (_) => const SplashPage(),
            settings: const RouteSettings(name: '/'),
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
      nav.setTab(index, arguments: args as Map<String, dynamic>?);
    });
    return const MainNavigationPage();
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
                '/register',
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
