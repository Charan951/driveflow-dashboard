import 'package:flutter/material.dart';

class AppSideNavLogo extends StatelessWidget {
  const AppSideNavLogo({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SafeArea(
      bottom: false,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        child: Image.asset(
          isDark ? 'assets/carzzilogo.png' : 'assets/carzzilogo_light.png',
          width: double.infinity,
          fit: BoxFit.contain,
          alignment: Alignment.center,
        ),
      ),
    );
  }
}
