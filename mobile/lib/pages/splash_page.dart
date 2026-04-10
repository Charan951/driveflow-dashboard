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
            // Premium background with orange glow
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF0F0F0F), // Deep black
                    Color(0xFF1A1A1A), // Dark gray
                  ],
                ),
              ),
            ),
            // Soft cinematic orange glow at center
            Center(
              child: Container(
                width: 400,
                height: 400,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(
                        0xFFFF6A00,
                      ).withValues(alpha: 0.15), // Cinematic orange glow
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.7],
                  ),
                ),
              ),
            ),
            // Logo with micro-animation
            Center(
              child: TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 500),
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
                      'assets/appicon.png',
                      width: 180,
                      color: Colors.white, // White logo as requested
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
