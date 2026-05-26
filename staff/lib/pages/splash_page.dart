import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../core/app_colors.dart';
import '../core/storage.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  final AuthService _authService = AuthService();
  bool _navigated = false;
  bool _isMovingUp = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    NotificationService().requestPermissions();

    // Wipe Keychain session left over from a previous install (iOS).
    await AppStorage().ensureStorageMatchesInstall();

    await Future.delayed(const Duration(milliseconds: 300));

    final user = await _authService.getCurrentUser();

    if (!mounted || _navigated) return;

    if (user != null) {
      await Future.delayed(const Duration(milliseconds: 100));
      if (!mounted) return;
      setState(() => _isMovingUp = true);

      await Future.delayed(const Duration(milliseconds: 600));
      if (!mounted || _navigated) return;

      _navigated = true;
      final role = user.role.toLowerCase();
      if (role == 'merchant') {
        Navigator.of(context).pushReplacementNamed('/merchant-dashboard');
      } else {
        Navigator.of(context).pushReplacementNamed('/home');
      }
      return;
    }

    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted || _navigated) return;
    _navigateToLogin();
  }

  void _navigateToLogin() {
    if (_navigated || !mounted) return;
    _navigated = true;
    Navigator.of(context).pushReplacementNamed('/login');
  }

  void _onInteract() {
    if (_navigated) return;
    _navigateToLogin();
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
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.splashDeepBlack,
                    AppColors.splashDarkGray,
                  ],
                ),
              ),
            ),
            Center(
              child: Container(
                width: 400,
                height: 400,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppColors.cinematicOrange.withValues(alpha: 0.15),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.7],
                  ),
                ),
              ),
            ),
            AnimatedAlign(
              duration: const Duration(milliseconds: 1500),
              curve: Curves.easeInOutQuart,
              alignment: _isMovingUp
                  ? const Alignment(0, -0.9)
                  : Alignment.center,
              child: TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 800),
                tween: Tween(begin: 0.0, end: 1.0),
                curve: Curves.easeOut,
                builder: (context, value, child) {
                  return Transform.scale(
                    scale: 0.9 + (0.1 * value),
                    child: Opacity(
                      opacity: value,
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
                      color: Colors.white,
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
