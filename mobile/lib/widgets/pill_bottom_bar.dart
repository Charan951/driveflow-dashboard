import 'package:flutter/material.dart';

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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final gradient = isDark
        ? LinearGradient(
            colors: [const Color(0xFF1E293B), const Color(0xFF0F172A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : const LinearGradient(
            colors: [Colors.white, Colors.white],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          );

    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.10)
        : Colors.grey.withValues(alpha: 0.10);

    final shadowColor = isDark
        ? Colors.black.withValues(alpha: 0.50)
        : Colors.black.withValues(alpha: 0.08);

    return SizedBox(
      height: 80,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: borderColor),
          boxShadow: [
            BoxShadow(
              color: shadowColor,
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Expanded(
                  child: GlassNavItem(
                    icon: Icons.settings_outlined,
                    label: 'Services',
                    isActive: selectedIndex == 0,
                    inactiveColor: inactive,
                    onTap: () => onTap(0),
                  ),
                ),
                Expanded(
                  child: GlassNavItem(
                    icon: Icons.shield_outlined,
                    label: 'Insurance',
                    isActive: selectedIndex == 1,
                    inactiveColor: inactive,
                    onTap: () => onTap(1),
                  ),
                ),
                const SizedBox(width: 72),
                Expanded(
                  child: GlassNavItem(
                    icon: Icons.water_drop_outlined,
                    label: 'Car Wash',
                    isActive: selectedIndex == 3,
                    inactiveColor: inactive,
                    onTap: () => onTap(3),
                  ),
                ),
                Expanded(
                  child: GlassNavItem(
                    icon: Icons.battery_full_outlined,
                    label: 'Battery/Tire',
                    isActive: selectedIndex == 4,
                    inactiveColor: inactive,
                    onTap: () => onTap(4),
                  ),
                ),
              ],
            ),
            Positioned(
              top: -20,
              child: CenterNavAction(
                isActive: selectedIndex == 2,
                onTap: () => onTap(2),
              ),
            ),
          ],
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

    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: gradient,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(999),
          child: const Center(
            child: Icon(Icons.home_outlined, color: Colors.white, size: 28),
          ),
        ),
      ),
    );
  }
}

class GlassNavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final Color inactiveColor;
  final VoidCallback onTap;

  const GlassNavItem({
    super.key,
    required this.icon,
    required this.label,
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
        padding: const EdgeInsets.symmetric(vertical: 4),
        decoration: const BoxDecoration(color: Colors.transparent),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedScale(
              scale: isActive ? 1.1 : 1.0,
              duration: const Duration(milliseconds: 260),
              curve: Curves.easeOutBack,
              child: isActive
                  ? ShaderMask(
                      shaderCallback: (bounds) => gradient.createShader(bounds),
                      child: Icon(icon, color: Colors.white, size: 24),
                    )
                  : Icon(icon, color: inactiveColor, size: 24),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive ? const Color(0xFF2563EB) : inactiveColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
