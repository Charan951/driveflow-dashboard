import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../main.dart' show rootNavigatorKey;

/// App-wide toast helper. Uses [rootNavigatorKey] so it can be called from
/// anywhere — including non-widget code like [ApiClient] — without needing
/// a local [BuildContext].
class AppToast {
  AppToast._();

  static void showError(String message) {
    final context = rootNavigatorKey.currentContext;
    if (context == null) return;
    _show(
      context,
      message: message,
      color: AppColors.error,
      icon: Icons.error_outline_rounded,
    );
  }

  static void showSuccess(String message) {
    final context = rootNavigatorKey.currentContext;
    if (context == null) return;
    _show(
      context,
      message: message,
      color: AppColors.success,
      icon: Icons.check_circle_outline_rounded,
    );
  }

  static void _show(
    BuildContext context, {
    required String message,
    required Color color,
    required IconData icon,
  }) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;

    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(message, style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 4),
      ),
    );
  }
}
