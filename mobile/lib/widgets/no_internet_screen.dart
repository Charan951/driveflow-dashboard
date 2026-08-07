import 'package:flutter/material.dart';
import '../core/app_colors.dart';

/// Full-screen overlay shown whenever the device has no network connection.
/// Pure Flutter animation (pulsing rings behind a Wi-Fi-off icon) — no
/// external asset/animation package needed.
class NoInternetScreen extends StatefulWidget {
  final VoidCallback? onRetry;

  const NoInternetScreen({super.key, this.onRetry});

  @override
  State<NoInternetScreen> createState() => _NoInternetScreenState();
}

class _NoInternetScreenState extends State<NoInternetScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: isDark
          ? AppColors.backgroundPrimary
          : AppColors.backgroundPrimaryLight,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  height: 48,
                  child: isDark
                      ? Image.asset(
                          'assets/carzzilogo.png',
                          fit: BoxFit.contain,
                        )
                      : ColorFiltered(
                          // Matches the web navbar's `brightness-0` treatment:
                          // renders the (metallic) logo as solid black so it
                          // stays legible on a light background.
                          colorFilter: const ColorFilter.mode(
                            Colors.black,
                            BlendMode.srcIn,
                          ),
                          child: Image.asset(
                            'assets/carzzilogo.png',
                            fit: BoxFit.contain,
                          ),
                        ),
                ),
                const SizedBox(height: 40),
                SizedBox(
                  width: 120,
                  height: 120,
                  child: AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      return Stack(
                        alignment: Alignment.center,
                        children: [
                          _pulseRing(delay: 0.0),
                          _pulseRing(delay: 0.5),
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.error.withValues(alpha: 0.12),
                            ),
                            child: const Icon(
                              Icons.wifi_off_rounded,
                              color: AppColors.error,
                              size: 34,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                const SizedBox(height: 28),
                Text(
                  'No Internet Connection',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                Text(
                  "Please check your Wi-Fi or mobile data. We'll reconnect automatically once you're back online.",
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: isDark ? Colors.white60 : Colors.black54,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (widget.onRetry != null) ...[
                  const SizedBox(height: 28),
                  ElevatedButton.icon(
                    onPressed: widget.onRetry,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Try Again'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 14,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// A ring that expands and fades out on a loop, offset by [delay] (0-1
  /// fraction of the animation cycle) so two rings pulse staggered.
  Widget _pulseRing({required double delay}) {
    final t = (_controller.value + delay) % 1.0;
    final scale = 0.5 + t * 0.8;
    final opacity = (1.0 - t).clamp(0.0, 1.0) * 0.35;
    return Transform.scale(
      scale: scale,
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.error.withValues(alpha: opacity),
        ),
      ),
    );
  }
}
