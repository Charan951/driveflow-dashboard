import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/app_colors.dart';
import '../core/app_styles.dart';
import '../state/theme_provider.dart';

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
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.mode == ThemeMode.dark;

    final backgroundColor = isDark
        ? AppColors.backgroundSecondary.withValues(alpha: 0.8)
        : Colors.white.withValues(alpha: 0.8);
    final borderColor = isDark ? AppColors.borderColor : Colors.grey[200]!;
    final shadowColor = isDark
        ? Colors.black.withValues(alpha: 0.4)
        : Colors.black.withValues(alpha: 0.1);
    final inactiveColor = isDark ? AppColors.textMuted : Colors.grey.shade400;

    return RepaintBoundary(
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          Container(
            height: 70,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(35),
              boxShadow: [
                BoxShadow(
                  color: shadowColor,
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(35),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    borderRadius: BorderRadius.circular(35),
                    border: Border.all(
                      color: borderColor.withValues(alpha: 0.5),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Expanded(
                        child: GlassNavItem(
                          activeIcon: Icons.settings_rounded,
                          inactiveIcon: Icons.settings_outlined,
                          label: 'Services',
                          isActive: selectedIndex == 0,
                          inactiveColor: inactiveColor,
                          onTap: () => onTap(0),
                        ),
                      ),
                      Expanded(
                        child: GlassNavItem(
                          activeIcon: Icons.shield_rounded,
                          inactiveIcon: Icons.shield_outlined,
                          label: 'Essentials',
                          isActive: selectedIndex == 1,
                          inactiveColor: inactiveColor,
                          onTap: () => onTap(1),
                        ),
                      ),
                      const SizedBox(width: 70),
                      Expanded(
                        child: GlassNavItem(
                          activeIcon: Icons.water_drop_rounded,
                          inactiveIcon: Icons.water_drop_outlined,
                          label: 'Wash',
                          isActive: selectedIndex == 3,
                          inactiveColor: inactiveColor,
                          onTap: () => onTap(3),
                        ),
                      ),
                      Expanded(
                        child: GlassNavItem(
                          activeIcon: Icons.battery_charging_full_rounded,
                          inactiveIcon: Icons.battery_charging_full_outlined,
                          label: 'Tyre & Battery',
                          isActive: selectedIndex == 4,
                          inactiveColor: inactiveColor,
                          onTap: () => onTap(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            top: -25,
            child: CenterNavAction(
              isActive: selectedIndex == 2,
              onTap: () => onTap(2),
            ),
          ),
        ],
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
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: AppStyles.primaryGradient,
        boxShadow: [
          BoxShadow(
            color: AppStyles.primaryBlue.withValues(alpha: 0.4),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (isActive) return;
            HapticFeedback.selectionClick();
            onTap();
          },
          borderRadius: BorderRadius.circular(999),
          child: const Center(
            child: Icon(Icons.home_rounded, color: Colors.white, size: 30),
          ),
        ),
      ),
    );
  }
}

class GlassNavItem extends StatelessWidget {
  final IconData activeIcon;
  final IconData inactiveIcon;
  final String label;
  final bool isActive;
  final Color inactiveColor;
  final VoidCallback onTap;

  const GlassNavItem({
    super.key,
    required this.activeIcon,
    required this.inactiveIcon,
    required this.label,
    required this.isActive,
    required this.inactiveColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        if (isActive) return;
        HapticFeedback.selectionClick();
        onTap();
      },
      borderRadius: BorderRadius.circular(18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isActive)
            ShaderMask(
              shaderCallback: (bounds) =>
                  AppStyles.primaryGradient.createShader(bounds),
              child: Icon(activeIcon, color: Colors.white, size: 22),
            )
          else
            Icon(inactiveIcon, color: inactiveColor, size: 20),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isActive ? AppStyles.primaryBlue : inactiveColor,
              fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
