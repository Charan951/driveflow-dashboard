import 'package:flutter/material.dart';

class AppStyles {
  // Colors
  static const Color softBackground = Color(0xFFF8F9FB);
  static const Color lightBlueTint = Color(0xFFEAF2FF);
  static const Color primaryBlue = Color(0xFF4A90E2);
  static const Color primaryPurple = Color(0xFF6C63FF);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primaryBlue, primaryPurple],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Text Styles
  static const TextStyle headingStyle = TextStyle(
    fontWeight: FontWeight.bold,
    fontSize: 20,
    color: Color(0xFF222222),
    fontFamily: 'Inter', // Assuming standard font or similar
  );

  static const TextStyle subtextStyle = TextStyle(
    fontSize: 14,
    color: Color(0xFF555555),
    fontWeight: FontWeight.w500,
  );

  static const TextStyle captionStyle = TextStyle(
    fontSize: 12,
    color: Color(0xFF888888),
  );

  // Spacing
  static const double spacingUnit = 8.0;
  static const EdgeInsetsGeometry paddingAll = EdgeInsets.all(spacingUnit * 2);
  static const EdgeInsetsGeometry paddingHorizontal = EdgeInsets.symmetric(
    horizontal: spacingUnit * 2,
  );
  static const EdgeInsetsGeometry paddingVertical = EdgeInsets.symmetric(
    vertical: spacingUnit * 2,
  );

  // Box Shadows
  static BoxShadow cardShadow = BoxShadow(
    color: Colors.black.withValues(alpha: 0.05),
    blurRadius: 12,
    offset: const Offset(0, 4),
  );

  static BoxShadow ctaShadow = BoxShadow(
    color: primaryBlue.withValues(alpha: 0.3),
    blurRadius: 15,
    offset: const Offset(0, 8),
  );

  static BoxShadow premiumShadow = BoxShadow(
    color: Colors.black.withValues(alpha: 0.08),
    blurRadius: 20,
    offset: const Offset(0, 10),
  );
}
