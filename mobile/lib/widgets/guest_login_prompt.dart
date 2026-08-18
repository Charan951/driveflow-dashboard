import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../utils/auth_gate.dart';

class GuestLoginPrompt extends StatelessWidget {
  final String title;
  final String message;

  const GuestLoginPrompt({
    super.key,
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.lock_outline,
                size: 48,
                color: isDark ? Colors.white54 : Colors.black45,
              ),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.4,
                  color: isDark ? Colors.white70 : Colors.black54,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () => ensureLoggedIn(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.cinematicOrange,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Log in',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pushNamed('/register'),
                child: const Text('Create an account'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
