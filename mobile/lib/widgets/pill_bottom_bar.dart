import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class PillBottomBar extends StatelessWidget {
  final int selectedIndex;
  final Function(int index) onTap;

  const PillBottomBar({
    super.key,
    required this.selectedIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const inactive = Color(0xFF94A3B8);
    final useBlur = !kIsWeb; // Blur is expensive on web
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final gradient = isDark
        ? LinearGradient(
            colors: [
              const Color(0xFF020617).withValues(alpha: useBlur ? 0.95 : 0.98),
              const Color(0xFF020617).withValues(alpha: useBlur ? 0.92 : 0.98),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : LinearGradient(
            colors: [
              Colors.white.withValues(alpha: useBlur ? 0.85 : 0.95),
              Colors.white.withValues(alpha: useBlur ? 0.75 : 0.95),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          );

    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.10)
        : Colors.white.withValues(alpha: 0.40);

    final shadowColor = isDark
        ? Colors.black.withValues(alpha: useBlur ? 0.65 : 0.50)
        : Colors.black.withValues(alpha: useBlur ? 0.16 : 0.10);

    return SizedBox(
      height: 72,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(36),
        clipBehavior: Clip.antiAlias,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(36),
            border: Border.all(color: borderColor),
            boxShadow: [
              BoxShadow(
                color: shadowColor,
                blurRadius: useBlur ? 24 : 12,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Expanded(
                    child: GlassNavItem(
                      icon: Icons.directions_car_filled_outlined,
                      isActive: selectedIndex == 0,
                      inactiveColor: inactive,
                      onTap: () => onTap(0),
                    ),
                  ),
                  Expanded(
                    child: GlassNavItem(
                      icon: Icons.calendar_month_outlined,
                      isActive: selectedIndex == 1,
                      inactiveColor: inactive,
                      onTap: () => onTap(1),
                    ),
                  ),
                  const SizedBox(width: 62),
                  Expanded(
                    child: GlassNavItem(
                      icon: Icons.receipt_long_outlined,
                      isActive: selectedIndex == 3,
                      inactiveColor: inactive,
                      onTap: () => onTap(3),
                    ),
                  ),
                  Expanded(
                    child: GlassNavItem(
                      icon: Icons.person_outline,
                      isActive: selectedIndex == 4,
                      inactiveColor: inactive,
                      onTap: () => onTap(4),
                    ),
                  ),
                ],
              ),
              CenterNavAction(
                isActive: selectedIndex == 2,
                onTap: () => onTap(2),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CenterNavAction extends StatelessWidget {
  final bool isActive;
  final VoidCallback onTap;

  const CenterNavAction({
    super.key,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const gradient = LinearGradient(
      colors: [Color(0xFF22D3EE), Color(0xFF2563EB)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );

    return SizedBox(
      width: 56,
      height: 56,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(999),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.transparent,
            ),
            child: isActive
                ? ShaderMask(
                    shaderCallback: (bounds) => gradient.createShader(bounds),
                    child: const Icon(
                      Icons.home_filled,
                      color: Colors.white,
                      size: 28,
                    ),
                  )
                : const Icon(
                    Icons.home_filled,
                    color: Color(0xFF94A3B8),
                    size: 28,
                  ),
          ),
        ),
      ),
    );
  }
}

class GlassNavItem extends StatelessWidget {
  final IconData icon;
  final bool isActive;
  final Color inactiveColor;
  final VoidCallback onTap;

  const GlassNavItem({
    super.key,
    required this.icon,
    required this.isActive,
    required this.inactiveColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const gradient = LinearGradient(
      colors: [Color(0xFF22D3EE), Color(0xFF2563EB), Color(0xFF60A5FA)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.all(12),
        decoration: const BoxDecoration(color: Colors.transparent),
        child: Center(
          child: AnimatedScale(
            scale: isActive ? 1.25 : 1.0,
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutBack,
            child: isActive
                ? ShaderMask(
                    shaderCallback: (bounds) => gradient.createShader(bounds),
                    child: Icon(icon, color: Colors.white, size: 28),
                  )
                : Icon(icon, color: inactiveColor, size: 26),
          ),
        ),
      ),
    );
  }
}
