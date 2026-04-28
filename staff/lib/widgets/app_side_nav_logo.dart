import 'package:flutter/material.dart';
import '../core/app_colors.dart';

class AppSideNavLogo extends StatelessWidget {
  const AppSideNavLogo({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(8, 60, 8, 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundPrimary : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppColors.borderColor : Colors.grey.shade200,
          ),
        ),
      ),
      child: SizedBox(
        width: double.infinity,
        child: Image.asset(
          'assets/carzzilogo.png',
          height: 120,
          fit: BoxFit.fitWidth,
          alignment: Alignment.center,
        ),
      ),
    );
  }
}
