import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../core/app_styles.dart';
import '../models/vehicle.dart'; // Assuming Vehicle model is available

class VehicleCard extends StatelessWidget {
  final Vehicle vehicle;
  final bool isSelected;
  final VoidCallback onTap;

  const VehicleCard({
    super.key,
    required this.vehicle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? const Color(0xFF1E293B) : Colors.white)
              : (isDark ? AppColors.backgroundSecondary : Colors.white),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? AppStyles.primaryBlue
                : (isDark ? AppColors.borderColor : AppColors.borderColorLight),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppStyles.primaryBlue.withValues(alpha: 0.15),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ]
              : [AppStyles.cardShadow],
        ),
        child: Row(
          children: [
            // Left: Circular icon container with soft background
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: isSelected
                    ? (isDark
                          ? AppStyles.primaryBlue.withValues(alpha: 0.2)
                          : Colors.white)
                    : (isDark ? Colors.grey.shade900 : Colors.grey.shade50),
                shape: BoxShape.circle,
                border: isSelected && !isDark
                    ? Border.all(
                        color: AppStyles.primaryBlue.withValues(alpha: 0.1),
                      )
                    : null,
              ),
              child: Icon(
                Icons.directions_car_filled_rounded,
                color: isSelected
                    ? AppStyles.primaryBlue
                    : Colors.grey.shade400,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            // Middle: Vehicle name + number (hierarchy)
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${vehicle.make} ${vehicle.model}',
                    style: AppStyles.headingStyle.copyWith(
                      fontSize: 17,
                      color: isDark
                          ? AppColors.textPrimary
                          : const Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.grey.shade800
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          vehicle.licensePlate.toUpperCase(),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: isDark
                                ? Colors.grey.shade300
                                : Colors.grey.shade700,
                          ),
                        ),
                      ),
                      if (vehicle.variant != null &&
                          vehicle.variant!.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Text(
                          vehicle.variant!,
                          style: AppStyles.captionStyle.copyWith(
                            color: isDark
                                ? AppColors.textMuted
                                : Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            // Right: checkmark
            if (isSelected)
              Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: AppStyles.primaryBlue,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check, color: Colors.white, size: 16),
              ),
          ],
        ),
      ),
    );
  }
}
