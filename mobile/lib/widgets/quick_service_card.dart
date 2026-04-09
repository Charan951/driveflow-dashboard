import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../core/app_styles.dart';

class QuickServiceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String price;
  final String? category;
  final VoidCallback? onTap;

  const QuickServiceCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.price,
    this.category,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.borderColor : Colors.grey.shade100,
          width: 1,
        ),
        boxShadow: [AppStyles.cardShadow],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon Container with soft background
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppStyles.primaryBlue.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(icon, color: AppStyles.primaryBlue, size: 24),
                ),
              ),
              const SizedBox(height: 16),
              // Title
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppStyles.headingStyle.copyWith(
                  fontSize: 16,
                  color: isDark
                      ? AppColors.textPrimary
                      : const Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 4),
              // Subtitle
              Expanded(
                child: Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppStyles.captionStyle.copyWith(
                    color: isDark
                        ? AppColors.textSecondary
                        : Colors.grey.shade500,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Price and Category
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    price,
                    style: TextStyle(
                      color: AppStyles.primaryBlue,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (category != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.grey.shade800
                            : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        category!.toUpperCase(),
                        style: TextStyle(
                          color: isDark
                              ? Colors.grey.shade300
                              : Colors.grey.shade600,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
