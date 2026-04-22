import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/app_colors.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';

class StaffLoginPage extends StatefulWidget {
  const StaffLoginPage({super.key});

  @override
  State<StaffLoginPage> createState() => _StaffLoginPageState();
}

class _StaffLoginPageState extends State<StaffLoginPage> {
  final AuthService _authService = AuthService();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isSubmitting = false;
  bool _showPassword = false;
  String? _errorText;

  bool _isValidEmail(String value) {
    final v = value.trim();
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
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
      final user = await _authService.login(email: email, password: password);
      if (!mounted) return;

      // Re-initialize socket with the new token after login
      await SocketService().reconnect();

      if (user.role == 'merchant') {
        Navigator.of(context).pushReplacementNamed('/merchant-dashboard');
      } else {
        Navigator.of(context).pushReplacementNamed('/home');
      }
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

    return Scaffold(
      body: Stack(
        children: [
          // Premium background with orange glow (from mobile)
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.splashDeepBlack, AppColors.splashDarkGray],
              ),
            ),
          ),
          // Soft cinematic orange glow at center (from mobile)
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
                      // Logo (from mobile)
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
                                onChanged: () {
                                  if (_errorText != null) {
                                    setState(() => _errorText = null);
                                  }
                                },
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
                              if (_errorText != null) ...[
                                const SizedBox(height: 16),
                                Text(
                                  _errorText!,
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
                                  onPressed: _isSubmitting ? null : _submit,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryBlue,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  child: _isSubmitting
                                      ? const SizedBox(
                                          width: 24,
                                          height: 24,
                                          child: CircularProgressIndicator(
                                            color: Colors.white,
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Text(
                                          'Login',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                ),
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
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final IconData prefixIcon;
  final Widget? suffix;
  final VoidCallback? onChanged;

  const _GlassField({
    required this.controller,
    required this.hintText,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    required this.prefixIcon,
    this.suffix,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        textInputAction: textInputAction,
        onChanged: (_) => onChanged?.call(),
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: const TextStyle(color: Colors.white38, fontSize: 15),
          prefixIcon: Icon(prefixIcon, color: Colors.white38, size: 20),
          suffixIcon: suffix,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),
      ),
    );
  }
}
