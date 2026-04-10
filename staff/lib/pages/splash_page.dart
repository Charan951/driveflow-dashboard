import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../core/storage.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../models/user.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage>
    with SingleTickerProviderStateMixin {
  final AuthService _authService = AuthService();
  late final AnimationController _bgController;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 14),
    )..repeat();
    unawaited(_bootstrap());
  }

  @override
  void dispose() {
    _bgController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    // Request notification permissions
    NotificationService().requestPermissions();

    await Future.delayed(const Duration(milliseconds: 600));

    final user = await _authService.getCurrentUser();
    if (user != null) {
      // If authenticated, wait 3 seconds (total) and go to home page
      await Future.delayed(const Duration(milliseconds: 2400));
      if (mounted && !_navigated) {
        _navigated = true;
        final role = user.role?.toLowerCase();
        if (role == 'merchant') {
          Navigator.of(context).pushReplacementNamed('/merchant-dashboard');
        } else {
          Navigator.of(context).pushReplacementNamed('/home');
        }
      }
    }
  }

  void _onInteract() async {
    if (_navigated) return;
    final user = await _authService.getCurrentUser();
    if (user == null) {
      _navigated = true;
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  void _goToLogin() {
    Navigator.of(context).pushReplacementNamed('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: GestureDetector(
        onTap: _onInteract,
        onTapDown: (_) => _onInteract(),
        onDoubleTap: _onInteract,
        onLongPress: _onInteract,
        onPanDown: (_) => _onInteract(),
        behavior: HitTestBehavior.opaque,
        child: Center(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) {
              return Opacity(opacity: value, child: child);
            },
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Padding(
                padding: const EdgeInsets.all(48.0),
                child: Image.asset(
                  'assets/appicon.png',
                  width: 220,
                  fit: BoxFit.fitWidth,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}


    }
  ]
}
