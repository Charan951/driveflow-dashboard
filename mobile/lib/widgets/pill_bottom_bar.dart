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

    return SizedBox(
      height: 72,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(36),
        clipBehavior: Clip.antiAlias,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.white.withValues(alpha: useBlur ? 0.78 : 0.95),
                Colors.white.withValues(alpha: useBlur ? 0.62 : 0.95),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(36),
            border: Border.all(color: Colors.white.withValues(alpha: 0.40)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: useBlur ? 0.16 : 0.10),
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
      colors: [Color(0xFF22D3EE), Color(0xFF4F46E5)],
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
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: gradient,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF4F46E5).withValues(alpha: 0.32),
                  blurRadius: isActive ? 28 : 22,
                  offset: const Offset(0, 12),
                ),
              ],
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.85),
                width: 2,
              ),
            ),
            child: const Icon(Icons.home_filled, color: Colors.white, size: 28),
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
      colors: [Color(0xFF22D3EE), Color(0xFF4F46E5), Color(0xFFF472B6)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
    final fg = isActive ? Colors.white : inactiveColor;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: isActive ? gradient : null,
          color: isActive ? null : Colors.transparent,
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: const Color(0xFF22D3EE).withValues(alpha: 0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: Center(
          child: AnimatedScale(
            scale: isActive ? 1.15 : 1.0,
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutBack,
            child: Icon(icon, color: fg, size: 26),
          ),
        ),
      ),
    );
  }
}
