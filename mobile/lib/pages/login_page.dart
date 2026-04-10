import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_colors.dart';
import '../state/auth_provider.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  String? _error;
  bool _showPassword = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool _isValidEmail(String value) {
    final v = value.trim();
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Stack(
        children: [
          // Premium background with orange glow
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.splashDeepBlack, AppColors.splashDarkGray],
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
                    AppColors.cinematicOrange.withValues(alpha: 0.15),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.7],
                ),
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
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Logo
                      Image.asset(
                        'assets/appicon.png',
                        width: 120,
                        color: Colors.white,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 32),
                      Card(
                        color: AppColors.backgroundSecondary.withValues(
                          alpha: 0.9,
                        ),
                        elevation: 8,
                        shadowColor: Colors.black.withValues(alpha: 0.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                          side: BorderSide(
                            color: Colors.white.withValues(alpha: 0.05),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'Welcome Back',
                                key: const Key('login_title'),
                                textAlign: TextAlign.center,
                                style: theme.textTheme.headlineSmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 32),
                              _GlassField(
                                controller: _emailController,
                                hintText: 'Email',
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                prefixIcon: Icons.mail_outline,
                              ),
                              const SizedBox(height: 20),
                              _GlassField(
                                controller: _passwordController,
                                hintText: 'Password',
                                obscureText: !_showPassword,
                                textInputAction: TextInputAction.done,
                                prefixIcon: Icons.lock_outline,
                                suffix: IconButton(
                                  onPressed: () => setState(
                                    () => _showPassword = !_showPassword,
                                  ),
                                  icon: Icon(
                                    _showPassword
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                    color: Colors.white38,
                                    size: 20,
                                  ),
                                ),
                              ),
                              if (_error != null) ...[
                                const SizedBox(height: 16),
                                Text(
                                  _error!,
                                  style: const TextStyle(
                                    color: AppColors.error,
                                    fontSize: 13,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                              const SizedBox(height: 32),
                              SizedBox(
                                height: 56,
                                child: ElevatedButton(
                                  onPressed: _submitting
                                      ? null
                                      : () async {
                                          FocusScope.of(context).unfocus();
                                          final email = _emailController.text
                                              .trim();
                                          final password =
                                              _passwordController.text;
                                          if (email.isEmpty) {
                                            setState(
                                              () =>
                                                  _error = 'Email is required',
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
                                          if (password.isEmpty) {
                                            setState(
                                              () => _error =
                                                  'Password is required',
                                            );
                                            return;
                                          }
                                          setState(() {
                                            _submitting = true;
                                            _error = null;
                                          });
                                          final auth = context
                                              .read<AuthProvider>();
                                          final ok = await auth.login(
                                            email,
                                            password,
                                          );
                                          if (!mounted) return;
                                          if (ok) {
                                            if (context.mounted) {
                                              Navigator.of(
                                                context,
                                              ).pushReplacementNamed(
                                                auth.homeRoute,
                                              );
                                            }
                                          } else {
                                            setState(() {
                                              _error =
                                                  auth.lastError ??
                                                  'Login failed';
                                            });
                                          }
                                          setState(() => _submitting = false);
                                        },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.cinematicOrange,
                                    foregroundColor: Colors.white,
                                    elevation: 4,
                                    shadowColor: AppColors.cinematicOrange
                                        .withValues(alpha: 0.4),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  child: _submitting
                                      ? const SizedBox(
                                          width: 24,
                                          height: 24,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            valueColor:
                                                AlwaysStoppedAnimation<Color>(
                                                  Colors.white,
                                                ),
                                          ),
                                        )
                                      : const Text(
                                          'Login',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            letterSpacing: 1,
                                          ),
                                        ),
                                ),
                              ),
                              const SizedBox(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Text(
                                    "Don't have an account? ",
                                    style: TextStyle(color: Colors.white60),
                                  ),
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pushReplacementNamed(
                                          context,
                                          '/register',
                                        ),
                                    child: const Text(
                                      'Sign Up',
                                      style: TextStyle(
                                        color: AppColors.cinematicOrange,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
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
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Widget? suffix;

  const _GlassField({
    required this.controller,
    required this.hintText,
    required this.prefixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(color: Colors.white38, fontSize: 14),
        prefixIcon: Icon(
          prefixIcon,
          color: AppColors.cinematicOrange,
          size: 20,
        ),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.03),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(
            color: AppColors.cinematicOrange,
            width: 1.5,
          ),
        ),
      ),
    );
  }
}
