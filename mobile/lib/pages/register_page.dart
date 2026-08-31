import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../core/app_colors.dart';
import '../core/form_validation.dart';
import '../core/phone_input_formatter.dart';
import '../state/auth_provider.dart';
import '../utils/auth_gate.dart';

class RegisterPage extends StatefulWidget {
  /// Prefilled when arriving from the login page after it determined this
  /// email/phone has no account yet — saves retyping.
  final String? initialEmail;
  final String? initialPhone;
  /// When the login page already sent the signup OTP for [initialPhone]
  /// (phone-first verification), this carries the masked number so the
  /// OTP field can show immediately instead of requiring a fresh send.
  final String? initialMaskedPhone;
  final bool otpAlreadySent;

  const RegisterPage({
    super.key,
    this.initialEmail,
    this.initialPhone,
    this.initialMaskedPhone,
    this.otpAlreadySent = false,
  });

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage>
    with SingleTickerProviderStateMixin {
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _passwordController;
  late final TextEditingController _confirmController;
  late final TextEditingController _phoneController;
  late final TextEditingController _otpController;
  bool _submitting = false;
  bool _showOtpStep = false;
  String? _maskedPhone;
  static const _resendCooldownSeconds = 30;
  int _resendSecondsLeft = 0;
  Timer? _resendTimer;
  String? _error;
  bool _showPassword = false;
  late final AnimationController _animationController;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;
  late final TapGestureRecognizer _termsRecognizer;
  late final TapGestureRecognizer _privacyRecognizer;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController(text: widget.initialEmail ?? '');
    _passwordController = TextEditingController();
    _confirmController = TextEditingController();
    _phoneController = TextEditingController(text: widget.initialPhone ?? '');
    _otpController = TextEditingController();
    _showOtpStep = widget.otpAlreadySent;
    _maskedPhone = widget.initialMaskedPhone;
    if (_showOtpStep) _startResendCountdown();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(
          CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
        );
    _animationController.forward();
    _termsRecognizer = TapGestureRecognizer()..onTap = _openTermsAndConditions;
    _privacyRecognizer = TapGestureRecognizer()..onTap = _openPrivacyPolicy;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    _resendTimer?.cancel();
    _animationController.dispose();
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    super.dispose();
  }

  void _clearError() {
    if (_error != null) setState(() => _error = null);
  }

  void _startResendCountdown() {
    _resendTimer?.cancel();
    setState(() => _resendSecondsLeft = _resendCooldownSeconds);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_resendSecondsLeft <= 1) {
        timer.cancel();
        setState(() => _resendSecondsLeft = 0);
      } else {
        setState(() => _resendSecondsLeft -= 1);
      }
    });
  }

  /// Sends the OTP for whatever's currently in the phone field — validates
  /// only the phone number, independent of Name/Email/Password, so it can
  /// fire the moment a valid number is known (including automatically,
  /// when arriving here with one already prefilled from login).
  Future<void> _handleSendPhoneOtp() async {
    if (_submitting) return;

    HapticFeedback.mediumImpact();
    FocusScope.of(context).unfocus();
    final phone = FormValidation.digitsOnly(_phoneController.text.trim());
    final phoneError = FormValidation.validatePhone(phone);
    if (phoneError != null) {
      setState(() => _error = phoneError);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final masked = await auth.sendPhoneSignupOtp(phone);
      if (!mounted) return;
      if (masked != null) {
        setState(() {
          _showOtpStep = true;
          _maskedPhone = masked;
          _otpController.clear();
        });
        _startResendCountdown();
      } else {
        setState(() => _error = auth.lastError ?? 'Failed to send OTP');
      }
    } catch (e, stackTrace) {
      debugPrint('Send phone OTP error: $e\n$stackTrace');
      if (mounted) setState(() => _error = 'An unexpected error occurred');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  bool _validateSignupForm({
    required String name,
    required String email,
    required String pass,
    required String confirm,
  }) {
    final nameError = FormValidation.validateName(name);
    if (nameError != null) {
      setState(() => _error = nameError);
      return false;
    }
    final emailError = FormValidation.validateEmail(
      email,
      rawInput: _emailController.text,
    );
    if (emailError != null) {
      setState(() => _error = emailError);
      return false;
    }
    final passwordError = FormValidation.validatePassword(pass);
    if (passwordError != null) {
      setState(() => _error = passwordError);
      return false;
    }
    if (pass != confirm) {
      setState(() => _error = 'Passwords do not match');
      return false;
    }
    return true;
  }

  /// Final submit — validates Name/Email/Password/Confirm + the OTP
  /// already sent for the phone, and creates the account in one call.
  Future<void> _handleCompleteSignup() async {
    if (_submitting) return;

    HapticFeedback.mediumImpact();
    FocusScope.of(context).unfocus();
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final pass = _passwordController.text;
    final confirm = _confirmController.text;
    final phone = FormValidation.digitsOnly(_phoneController.text.trim());
    final otp = _otpController.text.trim();

    if (!_validateSignupForm(
      name: name,
      email: email,
      pass: pass,
      confirm: confirm,
    )) {
      return;
    }
    final otpError = FormValidation.validateOtp(otp);
    if (otpError != null) {
      setState(() => _error = otpError);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final ok = await auth.completeSignup(
        name: name,
        email: email,
        password: pass,
        phone: phone,
        otp: otp,
      );
      if (!mounted) return;
      if (ok) {
        await completeAuthNavigation(context, auth.homeRoute);
      } else {
        setState(() => _error = auth.lastError ?? 'Could not create account');
      }
    } catch (e, stackTrace) {
      debugPrint('Complete signup error: $e\n$stackTrace');
      if (mounted) setState(() => _error = 'An unexpected error occurred');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _handleResendOtp() async {
    _otpController.clear();
    await _handleSendPhoneOtp();
  }

  void _openPrivacyPolicy() {
    Navigator.of(context).pushNamed('/privacy');
  }

  void _openTermsAndConditions() {
    Navigator.of(context).pushNamed('/terms');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      resizeToAvoidBottomInset: true,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        automaticallyImplyLeading: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white70,
        iconTheme: const IconThemeData(color: Colors.white70),
      ),
      body: Stack(
        children: [
          Container(color: AppColors.splashDeepBlack),
          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: Align(
                  alignment: Alignment.topCenter,
                  child: SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 8,
                    ),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/appicon.png',
                            width: 100,
                            color: Colors.white,
                            fit: BoxFit.contain,
                          ),
                          const SizedBox(height: 8),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(8, 8, 8, 24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  'Create Account',
                                  key: const Key('register_title'),
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.headlineSmall
                                      ?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.5,
                                      ),
                                ),
                                const SizedBox(height: 32),
                                _GlassField(
                                  controller: _nameController,
                                  hintText: 'Full Name',
                                  textInputAction: TextInputAction.next,
                                  prefixIcon: Icons.person_outline,
                                  maxLength: FormValidation.maxNameLength,
                                  onChanged: (_) => _clearError(),
                                ),
                                const SizedBox(height: 16),
                                _GlassField(
                                  controller: _emailController,
                                  hintText: 'Email',
                                  keyboardType: TextInputType.emailAddress,
                                  textInputAction: TextInputAction.next,
                                  prefixIcon: Icons.mail_outline,
                                  onChanged: (_) => _clearError(),
                                ),
                                const SizedBox(height: 16),
                                _GlassField(
                                  controller: _passwordController,
                                  hintText: 'Password',
                                  textInputAction: TextInputAction.next,
                                  prefixIcon: Icons.lock_outline,
                                  obscureText: !_showPassword,
                                  maxLength: 15,
                                  suffix: IconButton(
                                    onPressed: () => setState(
                                      () => _showPassword = !_showPassword,
                                    ),
                                    icon: Icon(
                                      _showPassword
                                          ? Icons.visibility
                                          : Icons.visibility_off,
                                      color: Colors.white38,
                                      size: 20,
                                    ),
                                  ),
                                  onChanged: (_) => _clearError(),
                                ),
                                const SizedBox(height: 16),
                                _GlassField(
                                  controller: _confirmController,
                                  hintText: 'Confirm Password',
                                  textInputAction: TextInputAction.next,
                                  prefixIcon: Icons.lock_outline,
                                  obscureText: !_showPassword,
                                  maxLength: 15,
                                  suffix: IconButton(
                                    onPressed: () => setState(
                                      () => _showPassword = !_showPassword,
                                    ),
                                    icon: Icon(
                                      _showPassword
                                          ? Icons.visibility
                                          : Icons.visibility_off,
                                      color: Colors.white38,
                                      size: 20,
                                    ),
                                  ),
                                  onChanged: (_) => _clearError(),
                                ),
                                const SizedBox(height: 16),
                                _GlassField(
                                  controller: _phoneController,
                                  hintText: 'Mobile number',
                                  keyboardType: TextInputType.phone,
                                  textInputAction: TextInputAction.done,
                                  prefixIcon: Icons.phone_outlined,
                                  enabled: !_showOtpStep,
                                  suffix: _showOtpStep
                                      ? const Icon(
                                          Icons.check_circle,
                                          color: Colors.greenAccent,
                                          size: 20,
                                        )
                                      : TextButton(
                                          onPressed: _submitting
                                              ? null
                                              : _handleSendPhoneOtp,
                                          child: const Text(
                                            'Send OTP',
                                            style: TextStyle(
                                              color:
                                                  AppColors.cinematicOrange,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                  onChanged: (_) => _clearError(),
                                  onSubmitted: (_) => _showOtpStep
                                      ? null
                                      : _handleSendPhoneOtp(),
                                ),
                                if (_showOtpStep) ...[
                                  const SizedBox(height: 16),
                                  Text(
                                    'Code sent to ${_maskedPhone ?? 'your WhatsApp'}',
                                    style: const TextStyle(
                                      color: Colors.white60,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  _GlassField(
                                    controller: _otpController,
                                    hintText: '6-digit OTP',
                                    keyboardType: TextInputType.number,
                                    textInputAction: TextInputAction.done,
                                    prefixIcon: Icons.sms_outlined,
                                    onChanged: (_) => _clearError(),
                                    onSubmitted: (_) =>
                                        _handleCompleteSignup(),
                                  ),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: _resendSecondsLeft > 0
                                        ? Padding(
                                            padding: const EdgeInsets.all(8),
                                            child: Text(
                                              'Resend OTP in ${_resendSecondsLeft}s',
                                              style: const TextStyle(
                                                color: Colors.white38,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          )
                                        : TextButton(
                                            onPressed: _submitting
                                                ? null
                                                : _handleResendOtp,
                                            child: const Text(
                                              'Resend OTP',
                                              style: TextStyle(
                                                color:
                                                    AppColors.cinematicOrange,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                  ),
                                ],
                                if (_error != null) ...[
                                  const SizedBox(height: 16),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.error.withValues(
                                        alpha: 0.1,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.error_outline,
                                          color: AppColors.error,
                                          size: 18,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            _error!,
                                            style: const TextStyle(
                                              color: AppColors.error,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 32),
                                SizedBox(
                                  height: 56,
                                  child: ElevatedButton(
                                    onPressed: _submitting
                                        ? null
                                        : (_showOtpStep
                                              ? _handleCompleteSignup
                                              : _handleSendPhoneOtp),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor:
                                          AppColors.cinematicOrange,
                                      foregroundColor: Colors.white,
                                      elevation: 4,
                                      shadowColor: AppColors.cinematicOrange
                                          .withValues(alpha: 0.4),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      disabledBackgroundColor: AppColors
                                          .cinematicOrange
                                          .withValues(alpha: 0.6),
                                    ),
                                    child: _submitting
                                        ? const SizedBox(
                                            width: 24,
                                            height: 24,
                                            child:
                                                CircularProgressIndicator.adaptive(
                                                  strokeWidth: 2.5,
                                                  valueColor:
                                                      AlwaysStoppedAnimation<
                                                        Color
                                                      >(Colors.white),
                                                ),
                                          )
                                        : Text(
                                            _showOtpStep
                                                ? 'Verify & Register'
                                                : 'Send OTP',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              letterSpacing: 1,
                                            ),
                                          ),
                                  ),
                                ),
                                const SizedBox(height: 24),
                                RichText(
                                  textAlign: TextAlign.center,
                                  text: TextSpan(
                                    style: const TextStyle(
                                      color: Colors.white38,
                                      fontSize: 11,
                                    ),
                                    children: [
                                      const TextSpan(
                                        text:
                                            'By registering you agree to our ',
                                      ),
                                      TextSpan(
                                        text: 'Terms & conditions',
                                        recognizer: _termsRecognizer,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                          decoration: TextDecoration.underline,
                                        ),
                                      ),
                                      const TextSpan(text: ' and '),
                                      TextSpan(
                                        text: 'privacy policies',
                                        recognizer: _privacyRecognizer,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                          decoration: TextDecoration.underline,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
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

class _GlassField extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final IconData prefixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Widget? suffix;
  final int? maxLength;
  final bool enabled;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  const _GlassField({
    required this.controller,
    required this.hintText,
    required this.prefixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.suffix,
    this.maxLength,
    this.enabled = true,
    this.onChanged,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      maxLength: maxLength,
      enabled: enabled,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      style: const TextStyle(color: Colors.white),
      inputFormatters: [
        if (keyboardType == TextInputType.emailAddress)
          FilteringTextInputFormatter.deny(RegExp(r'\s')),
        // Strips spaces/dashes/parens/country-code prefix and keeps only
        // the last 10 digits — handles pasting a number copied with +91
        // and formatting, not just typing.
        if (keyboardType == TextInputType.phone)
          IndianPhoneOrEmailInputFormatter(),
        if (keyboardType == TextInputType.number)
          FilteringTextInputFormatter.digitsOnly,
        if (keyboardType == TextInputType.number)
          LengthLimitingTextInputFormatter(6),
      ],
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(color: Colors.white38, fontSize: 14),
        prefixIcon: Icon(
          prefixIcon,
          color: AppColors.cinematicOrange,
          size: 20,
        ),
        suffixIcon: suffix,
        counterText: '',
        filled: true,
        fillColor: AppColors.backgroundSecondary.withValues(alpha: 0.9),
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
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
      ),
    );
  }
}
