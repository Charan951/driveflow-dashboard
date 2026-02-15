import 'dart:math';
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../services/auth_service.dart';

class StaffLoginPage extends StatefulWidget {
  const StaffLoginPage({super.key});

  @override
  State<StaffLoginPage> createState() => _StaffLoginPageState();
}

class _StaffLoginPageState extends State<StaffLoginPage>
    with SingleTickerProviderStateMixin {
  final AuthService _authService = AuthService();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isSubmitting = false;
  bool _showPassword = false;
  String? _errorText;
  late final AnimationController _bgController;

  bool _isValidEmail(String value) {
    final v = value.trim();
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v);
  }

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _bgController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty) {
      setState(() => _errorText = 'Email is required');
      return;
    }
    if (!_isValidEmail(email)) {
      setState(() => _errorText = 'Enter a valid email address');
      return;
    }
    if (password.isEmpty) {
      setState(() => _errorText = 'Password is required');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      await _authService.login(email: email, password: password);
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/home');
    } on ApiException catch (e) {
      setState(() {
        _errorText = e.message;
      });
    } catch (_) {
      setState(() {
        _errorText = 'Login failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final blurSigma = kIsWeb ? 10.0 : 18.0;
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: RepaintBoundary(
              child: AnimatedBuilder(
                animation: _bgController,
                builder: (context, _) =>
                    _CyberBackground(t: _bgController.value),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 18,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: 1),
                    duration: const Duration(milliseconds: 540),
                    curve: Curves.easeOutCubic,
                    builder: (context, value, child) {
                      return Transform.translate(
                        offset: Offset(0, (1 - value) * 18),
                        child: Opacity(opacity: value, child: child),
                      );
                    },
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(28),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(
                          sigmaX: blurSigma,
                          sigmaY: blurSigma,
                        ),
                        child: Container(
                          padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.18),
                            ),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x5522D3EE),
                                blurRadius: 26,
                                spreadRadius: 1,
                                offset: Offset(0, 12),
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'Staff Login',
                                textAlign: TextAlign.center,
                                style: theme.textTheme.headlineSmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Use your staff email and password.',
                                textAlign: TextAlign.center,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Colors.white70,
                                ),
                              ),
                              const SizedBox(height: 18),
                              _GlassField(
                                controller: _emailController,
                                hintText: 'Email',
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                prefixIcon: Icons.mail_outline,
                                onChanged: () {
                                  if (_errorText != null) {
                                    setState(() => _errorText = null);
                                  }
                                },
                              ),
                              const SizedBox(height: 14),
                              _GlassField(
                                controller: _passwordController,
                                hintText: 'Password',
                                textInputAction: TextInputAction.done,
                                prefixIcon: Icons.lock_outline,
                                obscureText: !_showPassword,
                                suffix: IconButton(
                                  onPressed: () => setState(
                                    () => _showPassword = !_showPassword,
                                  ),
                                  icon: Icon(
                                    _showPassword
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                    color: Colors.white70,
                                  ),
                                ),
                                onChanged: () {
                                  if (_errorText != null) {
                                    setState(() => _errorText = null);
                                  }
                                },
                              ),
                              const SizedBox(height: 6),
                              SizedBox(
                                height: 54,
                                child: DecoratedBox(
                                  decoration: const BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        Color(0xFF2563EB),
                                        Color(0xFF22D3EE),
                                      ],
                                    ),
                                    borderRadius: BorderRadius.all(
                                      Radius.circular(999),
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Color(0x5522D3EE),
                                        blurRadius: 20,
                                        offset: Offset(0, 10),
                                      ),
                                    ],
                                  ),
                                  child: ElevatedButton(
                                    onPressed: _isSubmitting ? null : _submit,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      shadowColor: Colors.transparent,
                                      foregroundColor: Colors.white,
                                      shape: const StadiumBorder(),
                                    ),
                                    child: _isSubmitting
                                        ? const SizedBox(
                                            width: 22,
                                            height: 22,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              valueColor:
                                                  AlwaysStoppedAnimation<Color>(
                                                    Colors.white,
                                                  ),
                                            ),
                                          )
                                        : const Text(
                                            'LOGIN',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 1.2,
                                            ),
                                          ),
                                  ),
                                ),
                              ),
                              if (_errorText != null) ...[
                                const SizedBox(height: 12),
                                Text(
                                  _errorText!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Color(0xFFFF6B6B),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GlassField extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final IconData prefixIcon;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final Widget? suffix;
  final VoidCallback? onChanged;

  const _GlassField({
    required this.controller,
    required this.hintText,
    required this.prefixIcon,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.suffix,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      obscureText: obscureText,
      style: const TextStyle(color: Colors.white),
      onChanged: (_) => onChanged?.call(),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(color: Colors.white60),
        prefixIcon: Icon(prefixIcon, color: Colors.white70),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.10),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.18)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF22D3EE), width: 2),
        ),
      ),
    );
  }
}

class _CyberBackground extends StatelessWidget {
  final double t;
  const _CyberBackground({required this.t});

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
                colors: [Color(0x334F46E5), Color(0x00000000)],
              ),
            ),
          ),
        ),
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xCC0B1220), Color(0xE60B1220)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
        CustomPaint(painter: _ParticlePainter(t: t)),
      ],
    );
  }
}

class _ParticlePainter extends CustomPainter {
  final double t;
  const _ParticlePainter({required this.t});

  static final List<Offset> _points = List<Offset>.generate(60, (i) {
    final rnd = Random(1337 + i * 31);
    return Offset(rnd.nextDouble(), rnd.nextDouble());
  });

  @override
  void paint(Canvas canvas, Size size) {
    final glow = Paint()
      ..color = const Color(0xFF22D3EE).withValues(alpha: 0.22)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    final dot = Paint()
      ..color = const Color(0xFF22D3EE).withValues(alpha: 0.35);
    final line = Paint()
      ..color = const Color(0xFF22D3EE).withValues(alpha: 0.14)
      ..strokeWidth = 1;

    final drift = t * size.height * 0.35;
    for (final p in _points) {
      final x = p.dx * size.width;
      final y = (p.dy * size.height + drift) % size.height;
      canvas.drawCircle(Offset(x, y), 2.0, glow);
      canvas.drawCircle(Offset(x, y), 1.1, dot);
    }

    final grid = Paint()
      ..color = Colors.white.withValues(alpha: 0.05)
      ..strokeWidth = 1;
    const step = 64.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final scanY = (t * size.height) % size.height;
    final scan = Rect.fromLTWH(0, scanY - 120, size.width, 240);
    final scanPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0x00000000), Color(0x3322D3EE), Color(0x00000000)],
        stops: [0, 0.5, 1],
      ).createShader(scan);
    canvas.drawRect(scan, scanPaint);

    final start = Offset(size.width * 0.15, size.height * 0.72);
    final end = Offset(size.width * 0.85, size.height * 0.42);
    canvas.drawLine(start, end, line);
    canvas.drawCircle(start, 3.2, glow);
    canvas.drawCircle(end, 3.2, glow);
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter oldDelegate) =>
      oldDelegate.t != t;
}
