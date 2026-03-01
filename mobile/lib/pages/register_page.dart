import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../state/auth_provider.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage>
    with TickerProviderStateMixin {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _submitting = false;
  String? _error;
  bool _showPassword = false;

  AnimationController? _bgController;

  bool _isValidEmail(String value) {
    final v = value.trim();
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v);
  }

  String _digitsOnly(String value) {
    return value.replaceAll(RegExp(r'[^0-9]'), '');
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
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    _phoneController.dispose();
    _bgController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: RepaintBoundary(
              child: AnimatedBuilder(
                animation: _bgController!,
                builder: (context, _) =>
                    _SplashBackground(t: _bgController!.value),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Card(
                    color: Colors.white.withValues(alpha: 0.06),
                    elevation: 12,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                      side: BorderSide(
                        color: Colors.white.withValues(alpha: 0.14),
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Create Your Account',
                            key: const Key('register_title'),
                            textAlign: TextAlign.center,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 22),
                          _GlassField(
                            controller: _nameController,
                            hintText: 'Full Name',
                            textInputAction: TextInputAction.next,
                            prefixIcon: Icons.person_outline,
                            onChanged: () {
                              if (_error != null) {
                                setState(() => _error = null);
                              }
                            },
                          ),
                          const SizedBox(height: 14),
                          _GlassField(
                            controller: _emailController,
                            hintText: 'Email',
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            prefixIcon: Icons.mail_outline,
                            onChanged: () {
                              if (_error != null) {
                                setState(() => _error = null);
                              }
                            },
                          ),
                          const SizedBox(height: 14),
                          _GlassField(
                            controller: _passwordController,
                            hintText: 'Password',
                            textInputAction: TextInputAction.next,
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
                              if (_error != null) {
                                setState(() => _error = null);
                              }
                            },
                          ),
                          const SizedBox(height: 14),
                          _GlassField(
                            controller: _confirmController,
                            hintText: 'Confirm Password',
                            textInputAction: TextInputAction.next,
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
                              if (_error != null) {
                                setState(() => _error = null);
                              }
                            },
                          ),
                          const SizedBox(height: 14),
                          _GlassField(
                            controller: _phoneController,
                            hintText: 'Mobile Number',
                            keyboardType: TextInputType.phone,
                            textInputAction: TextInputAction.done,
                            prefixIcon: Icons.phone_outlined,
                            onChanged: () {
                              if (_error != null) {
                                setState(() => _error = null);
                              }
                            },
                          ),
                          const SizedBox(height: 18),
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
                                onPressed: _submitting
                                    ? null
                                    : () async {
                                        FocusScope.of(context).unfocus();
                                        final name = _nameController.text
                                            .trim();
                                        final email = _emailController.text
                                            .trim();
                                        final pass = _passwordController.text;
                                        final confirm = _confirmController.text;
                                        final phone = _phoneController.text
                                            .trim();

                                        if (name.isEmpty) {
                                          setState(
                                            () => _error =
                                                'Full name is required',
                                          );
                                          return;
                                        }
                                        if (email.isEmpty) {
                                          setState(
                                            () => _error = 'Email is required',
                                          );
                                          return;
                                        }
                                        if (!_isValidEmail(email)) {
                                          setState(
                                            () => _error =
                                                'Enter a valid email address',
                                          );
                                          return;
                                        }
                                        if (phone.isNotEmpty) {
                                          final digits = _digitsOnly(phone);
                                          if (digits.length < 10) {
                                            setState(
                                              () => _error =
                                                  'Enter a valid phone number',
                                            );
                                            return;
                                          }
                                        }

                                        final hasLen = pass.length >= 8;
                                        final hasNum = RegExp(
                                          r'\d',
                                        ).hasMatch(pass);
                                        final hasUpper = RegExp(
                                          r'[A-Z]',
                                        ).hasMatch(pass);
                                        if (!hasLen || !hasNum || !hasUpper) {
                                          setState(
                                            () => _error =
                                                'Password does not meet requirements',
                                          );
                                          return;
                                        }
                                        if (pass != confirm) {
                                          setState(
                                            () => _error =
                                                'Passwords do not match',
                                          );
                                          return;
                                        }
                                        setState(() {
                                          _submitting = true;
                                          _error = null;
                                        });
                                        final navigator = Navigator.of(context);
                                        final auth = context
                                            .read<AuthProvider>();
                                        final ok = await auth.register(
                                          name,
                                          email,
                                          pass,
                                          phone: phone,
                                        );
                                        if (!mounted) return;
                                        if (ok) {
                                          navigator.pushReplacementNamed(
                                            auth.homeRoute,
                                          );
                                        } else {
                                          setState(() {
                                            _error =
                                                auth.lastError ??
                                                'Registration failed';
                                          });
                                        }
                                        setState(() => _submitting = false);
                                      },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.transparent,
                                  shadowColor: Colors.transparent,
                                  foregroundColor: Colors.white,
                                  shape: const StadiumBorder(),
                                ),
                                child: _submitting
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
                                        'CONTINUE',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.2,
                                        ),
                                      ),
                              ),
                            ),
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 12),
                            Text(
                              _error!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Color(0xFFFF6B6B)),
                            ),
                          ],
                          const SizedBox(height: 14),
                          Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              const Text(
                                'Already have account? ',
                                style: TextStyle(color: Colors.white70),
                              ),
                              GestureDetector(
                                key: const Key('register_to_login'),
                                onTap: () => Navigator.pushReplacementNamed(
                                  context,
                                  '/login',
                                ),
                                child: const Text(
                                  'Login',
                                  style: TextStyle(
                                    color: Color(0xFF22D3EE),
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          GestureDetector(
                            onTap: () async {
                              const url =
                                  'https://car.speshwayhrms.com/privacy';
                              if (await canLaunchUrl(Uri.parse(url))) {
                                await launchUrl(Uri.parse(url));
                              }
                            },
                            child: const Text(
                              'By registering, you agree to our Privacy Policy',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white38,
                                fontSize: 11,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                        ],
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
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xCC0B1220), Color(0xE60B1220)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
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
