import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/api_client.dart';
import '../core/app_colors.dart';
import '../models/user.dart';
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
  final TextEditingController _otpController = TextEditingController();

  bool _isSubmitting = false;
  bool _showPassword = false;
  bool _showOtpStep = false;
  String? _maskedPhone;
  String? _errorText;

  bool _isValidEmail(String value) {
    final v = value.trim();
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _clearError() {
    if (_errorText != null) setState(() => _errorText = null);
  }

  void _navigateAfterLogin(StaffUser user) {
    final role = user.role.toLowerCase();
    if (role == 'merchant') {
      Navigator.of(context).pushReplacementNamed('/merchant-dashboard');
    } else if (role == 'staff' || role == 'admin') {
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      _authService.logout();
      setState(() {
        _errorText = 'Access denied. Staff or merchant account required.';
      });
    }
  }

  Future<void> _handleCredentials() async {
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
      final result = await _authService.prepareLogin(
        email: email,
        password: password,
      );

      if (!mounted) return;

      if (result.user != null) {
        await SocketService().reconnect();
        _navigateAfterLogin(result.user!);
        return;
      }

      setState(() {
        _showOtpStep = true;
        _maskedPhone = result.maskedPhone;
        _otpController.clear();
      });

      final masked = await _authService.sendLoginOtp(email: email);
      if (!mounted) return;
      if (masked.isNotEmpty) {
        setState(() => _maskedPhone = masked);
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _errorText = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _errorText = 'Login failed. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _handleVerifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();

    if (otp.length != 6) {
      setState(() => _errorText = 'Enter the 6-digit OTP');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      final user = await _authService.verifyLoginOtp(email: email, otp: otp);
      if (!mounted) return;
      await SocketService().reconnect();
      _navigateAfterLogin(user);
    } on ApiException catch (e) {
      if (mounted) setState(() => _errorText = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _errorText = 'OTP verification failed. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _handleResendOtp() async {
    final email = _emailController.text.trim();
    setState(() {
      _isSubmitting = true;
      _errorText = null;
      _otpController.clear();
    });

    try {
      final masked = await _authService.sendLoginOtp(email: email);
      if (!mounted) return;
      if (masked.isNotEmpty) {
        setState(() => _maskedPhone = masked);
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _errorText = e.message);
    } catch (_) {
      if (mounted) setState(() => _errorText = 'Failed to resend OTP');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.splashDeepBlack, AppColors.splashDarkGray],
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
                                _showOtpStep ? 'Verify OTP' : 'Welcome Back',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 28,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              if (_showOtpStep) ...[
                                const SizedBox(height: 8),
                                Text(
                                  'Code sent to ${_maskedPhone ?? 'your WhatsApp'}',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Colors.white60,
                                    fontSize: 13,
                                  ),
                                ),
                              ] else ...[
                                const SizedBox(height: 4),
                                const Text(
                                  'Sign in to your staff or merchant account',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: Colors.white54,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 32),
                              if (!_showOtpStep) ...[
                                _GlassField(
                                  controller: _emailController,
                                  hintText: 'Email',
                                  keyboardType: TextInputType.emailAddress,
                                  textInputAction: TextInputAction.next,
                                  prefixIcon: Icons.mail_outline,
                                  onChanged: _clearError,
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
                                  onChanged: _clearError,
                                  onSubmitted: (_) => _handleCredentials(),
                                ),
                              ] else ...[
                                _GlassField(
                                  controller: _otpController,
                                  hintText: '6-digit OTP',
                                  keyboardType: TextInputType.number,
                                  textInputAction: TextInputAction.done,
                                  prefixIcon: Icons.sms_outlined,
                                  maxLength: 6,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                  ],
                                  onChanged: _clearError,
                                  onSubmitted: (_) => _handleVerifyOtp(),
                                ),
                              ],
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
                                  onPressed: _isSubmitting
                                      ? null
                                      : (_showOtpStep
                                            ? _handleVerifyOtp
                                            : _handleCredentials),
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
                                      : Text(
                                          _showOtpStep
                                              ? 'Verify & Sign In'
                                              : 'Continue',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                ),
                              ),
                              if (_showOtpStep) ...[
                                const SizedBox(height: 16),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    TextButton(
                                      onPressed: _isSubmitting
                                          ? null
                                          : () {
                                              setState(() {
                                                _showOtpStep = false;
                                                _otpController.clear();
                                                _errorText = null;
                                              });
                                            },
                                      child: const Text(
                                        'Back',
                                        style: TextStyle(color: Colors.white60),
                                      ),
                                    ),
                                    TextButton(
                                      onPressed:
                                          _isSubmitting ? null : _handleResendOtp,
                                      child: const Text(
                                        'Resend OTP',
                                        style: TextStyle(
                                          color: AppColors.primaryBlue,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
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
  final ValueChanged<String>? onSubmitted;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;

  const _GlassField({
    required this.controller,
    required this.hintText,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    required this.prefixIcon,
    this.suffix,
    this.onChanged,
    this.onSubmitted,
    this.maxLength,
    this.inputFormatters,
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
        maxLength: maxLength,
        inputFormatters: inputFormatters,
        onChanged: (_) => onChanged?.call(),
        onSubmitted: onSubmitted,
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: InputDecoration(
          filled: false,
          hintText: hintText,
          hintStyle: const TextStyle(color: Colors.white38, fontSize: 15),
          prefixIcon: Icon(prefixIcon, color: Colors.white38, size: 20),
          suffixIcon: suffix,
          counterText: '',
          isDense: true,
          fillColor: Colors.transparent,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
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
