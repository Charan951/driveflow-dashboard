import 'dart:math';
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
    _navigated = true;
    Navigator.of(context).pushReplacementNamed('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1220),
      body: GestureDetector(
        onTap: _onInteract,
        onTapDown: (_) => _onInteract(),
        onDoubleTap: _onInteract,
        onLongPress: _onInteract,
        onPanDown: (_) => _onInteract(),
        behavior: HitTestBehavior.opaque,
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 112,
                      height: 112,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.black.withValues(alpha: 0.18),
                        border: Border.all(
                          color: const Color(0xFF22D3EE),
                          width: 3,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: Image.asset(
                          'assets/appicon.png',
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'CARZZI CARE',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                            color: Colors.white,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Car Services',
                      textAlign: TextAlign.center,
                      style: Theme.of(
                        context,
                      ).textTheme.bodyLarge?.copyWith(color: Colors.white70),
                    ),
                    const SizedBox(height: 40),
                    Text(
                      'Tap to Continue',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        letterSpacing: 1.2,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SplashBackground extends StatelessWidget {
  final double t;
  const _SplashBackground({required this.t});

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF0B1220), Color(0xFF071B2E)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
        Positioned(
          top: -180,
          left: -140,
          child: Container(
            width: 420,
            height: 420,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [Color(0x4422D3EE), Color(0x00000000)],
              ),
            ),
          ),
        ),
        Positioned(
          bottom: -220,
          right: -160,
          child: Container(
            width: 520,
            height: 520,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [Color(0x332563EB), Color(0x00000000)],
              ),
            ),
          ),
        ),
        Container(decoration: const BoxDecoration(color: Colors.black)),
        CustomPaint(
          painter: _SplashParticlePainter(t: t),
          isComplex: true,
          willChange: true,
        ),
      ],
    );
  }
}

class _SplashParticlePainter extends CustomPainter {
  final double t;
  const _SplashParticlePainter({required this.t});

  static final List<Offset> _points = List<Offset>.generate(70, (i) {
    final rnd = Random(444 + i * 37);
    return Offset(rnd.nextDouble(), rnd.nextDouble());
  });

  @override
  void paint(Canvas canvas, Size size) {
    final glow = Paint()
      ..color = const Color(0xFF22D3EE).withValues(alpha: 0.20)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    final dot = Paint()
      ..color = const Color(0xFF22D3EE).withValues(alpha: 0.34);

    final drift = t * size.height * 0.38;
    for (final p in _points) {
      final x = p.dx * size.width;
      final y = (p.dy * size.height + drift) % size.height;
      canvas.drawCircle(Offset(x, y), 2.0, glow);
      canvas.drawCircle(Offset(x, y), 1.1, dot);
    }

    final grid = Paint()
      ..color = Colors.white.withValues(alpha: 0.045)
      ..strokeWidth = 1;
    const step = 72.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final scanY = (t * size.height) % size.height;
    final scan = Rect.fromLTWH(0, scanY - 160, size.width, 320);
    final scanPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0x00000000), Color(0x3322D3EE), Color(0x00000000)],
        stops: [0, 0.5, 1],
      ).createShader(scan);
    canvas.drawRect(scan, scanPaint);
  }

  @override
  bool shouldRepaint(covariant _SplashParticlePainter oldDelegate) =>
      oldDelegate.t != t;
}
