import 'package:flutter/material.dart';
import '../core/app_colors.dart';

class InsurancePage extends StatelessWidget {
  const InsurancePage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = isDark
        ? AppColors.backgroundSecondary
        : Colors.white;
    final textColor = isDark
        ? AppColors.textPrimary
        : AppColors.textPrimaryLight;
    final subTextColor = isDark
        ? AppColors.textSecondary
        : Colors.grey[600];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Insurance',
          style: TextStyle(fontWeight: FontWeight.bold, color: textColor),
        ),
        elevation: 0,
        backgroundColor: backgroundColor,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.shield_outlined,
                size: 80,
                color: isDark ? AppColors.primaryBlue : Colors.blue,
              ),
              const SizedBox(height: 24),
              Text(
                'Insurance features have been removed',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Please manage essentials and other services using the Services and Essentials modules instead.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: subTextColor,
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                },
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
