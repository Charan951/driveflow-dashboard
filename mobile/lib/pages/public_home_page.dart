import 'package:flutter/material.dart';
import '../core/app_colors.dart';

class PublicHomePage extends StatelessWidget {
  const PublicHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Spacer(),
            const Text(
              'Welcome to Carzzi',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.primaryBlue,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Your trusted vehicle care partner',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
            const Spacer(),
            _ActionButton(
              label: 'Browse Services',
              icon: Icons.build_outlined,
              gradient: const LinearGradient(
                colors: [AppColors.primaryBlue, AppColors.primaryBlueDark],
              ),
              onPressed: () => Navigator.pushNamed(context, '/services'),
            ),
            const SizedBox(height: 16),
            _ActionButton(
              label: 'Login',
              icon: Icons.login_outlined,
              gradient: LinearGradient(
                colors: [
                  AppColors.cinematicOrange,
                  AppColors.cinematicOrange.withValues(alpha: 0.8),
                ],
              ),
              onPressed: () => Navigator.pushNamed(context, '/login'),
            ),
            const SizedBox(height: 16),
            _ActionButton(
              label: 'Register',
              icon: Icons.person_add_outlined,
              gradient: const LinearGradient(
                colors: [AppColors.primaryPurple, Color(0xFF5B21B6)],
              ),
              onPressed: () => Navigator.pushNamed(context, '/register'),
            ),
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Gradient gradient;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.gradient,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: (gradient as LinearGradient).colors.first.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 18),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: Colors.white, size: 22),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}