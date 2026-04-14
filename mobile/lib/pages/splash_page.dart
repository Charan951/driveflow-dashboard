import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_provider.dart';
import '../services/notification_service.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  bool _navigated = false;
  bool _isMovingUp = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final auth = context.read<AuthProvider>();

    // Start loading session immediately in background
    final loadMeFuture = auth.loadMe();

    // Request notification permissions
    NotificationService().requestPermissions();

    // Ensure data is loaded
    await loadMeFuture;

    if (mounted && auth.isAuthenticated) {
      // Small delay before moving up for better visual flow
      await Future.delayed(const Duration(milliseconds: 400));
      if (mounted) {
        setState(() {
          _isMovingUp = true;
        });
      }
    }
  }

  void _onInteract() {
    if (_navigated) return;
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      _navigated = true;
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GestureDetector(
        onTap: _onInteract,
        onTapDown: (_) => _onInteract(),
        onDoubleTap: _onInteract,
        onLongPress: _onInteract,
        onPanDown: (_) => _onInteract(),
        behavior: HitTestBehavior.opaque,
        child: Stack(
          children: [
            // Black background
            Container(color: Colors.black),
            AnimatedAlign(
              duration: const Duration(milliseconds: 1500),
              curve: Curves.easeInOutQuart,
              alignment: _isMovingUp
                  ? const Alignment(0, -0.9)
                  : Alignment.center,
              child: TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 800),
                tween: Tween(begin: 0.0, end: 1.0),
                curve: Curves.easeOut, // Smooth premium finish
                builder: (context, value, child) {
                  return Transform.scale(
                    scale: 0.9 + (0.1 * value), // Scale: 0.9 -> 1.0
                    child: Opacity(
                      opacity: value, // Fade: 0 -> 1
                      child: child,
                    ),
                  );
                },
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Padding(
                    padding: const EdgeInsets.all(48.0),
                    child: Image.asset(
                      'assets/splashscreen.png',
                      width: 180,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
