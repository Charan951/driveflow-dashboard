import 'package:flutter/material.dart';

import 'pages/home_page.dart';
import 'pages/login_page.dart';
import 'pages/order_detail_page.dart';
import 'pages/splash_page.dart';

void main() {
  runApp(const StaffApp());
}

class StaffApp extends StatelessWidget {
  const StaffApp({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(seedColor: Colors.deepPurple);
    return MaterialApp(
      title: 'DriveFlow Staff',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
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
        '/order': (context) => const StaffOrderDetailPage(),
      },
    );
  }
}
