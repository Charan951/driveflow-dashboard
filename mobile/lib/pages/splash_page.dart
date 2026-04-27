import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_provider.dart';
import '../services/notification_service.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage>
    with SingleTickerProviderStateMixin {
  bool _navigated = false;
  bool _isMovingUp = false;
  late final AnimationController _animationController;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _scaleAnimation = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _animationController.forward();
    _bootstrap();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final auth = context.read<AuthProvider>();
    final loadMeFuture = auth.loadMe();
    NotificationService().requestPermissions();
    await loadMeFuture;

    if (!mounted) return;

    if (auth.isAuthenticated) {
      // Small delay to allow logo animation to feel natural
      await Future.delayed(const Duration(milliseconds: 300));
      if (mounted) {
        setState(() => _isMovingUp = true);
      }
      // Wait for animation to complete before letting RootGate switch
      await Future.delayed(const Duration(milliseconds: 500));
    } else {
      // For non-authorized users, we don't navigate automatically anymore.
      // They must click the screen to go to login.
      await Future.delayed(const Duration(milliseconds: 300));
    }
  }

  void _onInteract() {
    if (_navigated) return;
    final auth = context.read<AuthProvider>();
    // Only allow interaction if we've determined the user is not authenticated
    if (auth.isInitialized && !auth.isAuthenticated) {
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
            Container(color: Colors.black),
            AnimatedAlign(
              duration: const Duration(milliseconds: 600),
              curve:
                  Curves.easeOutBack, // Added a little bounce for a better feel
              alignment: _isMovingUp
                  ? const Alignment(0, -0.9)
                  : Alignment.center,
              child: AnimatedBuilder(
                animation: _animationController,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _scaleAnimation.value,
                    child: Opacity(
                      opacity: _opacityAnimation.value,
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
