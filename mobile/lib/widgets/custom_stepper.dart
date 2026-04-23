import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../core/app_styles.dart';

class CustomStepper extends StatelessWidget {
  final List<String> steps;
  final int currentStep;

  const CustomStepper({
    super.key,
    required this.steps,
    required this.currentStep,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark
        ? AppColors.textPrimary
        : AppColors.textPrimaryLight;
    final mutedColor = isDark ? AppColors.textMuted : AppColors.textMutedLight;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [AppStyles.cardShadow],
      ),
      child: Row(
        children: steps.asMap().entries.map((entry) {
          int idx = entry.key;
          String label = entry.value;
          bool isActive = currentStep == idx;
          bool isCompleted = currentStep > idx;

          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: (isActive || isCompleted)
                              ? AppStyles.primaryGradient
                              : null,
                          color: !(isActive || isCompleted)
                              ? (isDark
                                    ? Colors.grey.shade900
                                    : Colors.grey.shade100)
                              : null,
                          boxShadow: (isActive || isCompleted)
                              ? [
                                  BoxShadow(
                                    color: AppStyles.primaryBlue.withValues(
                                      alpha: 0.3,
                                    ),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: isCompleted
                              ? const Icon(
                                  Icons.check,
                                  color: Colors.white,
                                  size: 16,
                                )
                              : Text(
                                  '${idx + 1}',
                                  style: TextStyle(
                                    color: (isActive || isCompleted)
                                        ? Colors.white
                                        : mutedColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10,
                          color: (isActive || isCompleted)
                              ? textColor
                              : mutedColor,
                          fontWeight: (isActive || isCompleted)
                              ? FontWeight.w700
                              : FontWeight.w500,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
                ),
                if (idx < steps.length - 1)
                  Expanded(
                    child: Container(
                      height: 3,
                      margin: const EdgeInsets.only(bottom: 20),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(2),
                        color: isCompleted
                            ? AppStyles.primaryBlue
                            : isDark
                            ? Colors.grey.shade800
                            : Colors.grey.shade200,
                        gradient: isCompleted
                            ? AppStyles.primaryGradient
                            : null,
                      ),
                    ),
                  ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
