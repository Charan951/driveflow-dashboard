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

    // Every AppToast SnackBar has the same-shaped content (Row of icon +
    // text), and Flutter's SnackBar wraps content in a Hero tagged from
    // content.toString() — which for a Row doesn't include the Text
    // inside, so all AppToast snackbars share one Hero tag. hideCurrentSnackBar()
    // only starts a closing *animation*, so a still-animating-out toast and a
    // freshly shown one can briefly coexist with that same tag — especially
    // right before a route change (e.g. logout) — which crashes with
    // "multiple heroes share the same tag". removeCurrentSnackBar() removes
    // it instantly instead, so there's never more than one in the tree.
    messenger.removeCurrentSnackBar();
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
