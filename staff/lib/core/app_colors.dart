import 'package:flutter/material.dart';

class AppColors {
  // Brand Colors
  static const Color primaryBlue = Color.fromARGB(255, 50, 126, 232);
  static const Color primaryBlueDark = Color.fromARGB(255, 93, 136, 230);
  static const Color primaryBlueSoft = Color(0xFF4D95F9);

  // Cinematic/Splash Colors
  static const Color cinematicOrange = Color(0xFFFF6A00);
  static const Color splashDeepBlack = Color(0xFF0F0F0F);
  static const Color splashDarkGray = Color(0xFF1A1A1A);

  // Background Colors
  static const Color backgroundPrimary = Color(0xFF0D0D0D); // Scaffold (Dark)
  static const Color backgroundSecondary = Color(0xFF121212); // Cards (Dark)
  static const Color backgroundSurface = Color(
    0xFF1A1A1A,
  ); // Elevated UI (Dark)
  static const Color borderColor = Color(0xFF262626); // (Dark)

  // Light Mode Colors
  static const Color backgroundPrimaryLight = Color(0xFFFFFFFF);
  static const Color backgroundSecondaryLight = Color(0xFFFFFFFF);
  static const Color backgroundSurfaceLight = Color(0xFFFFFFFF);
  static const Color borderColorLight = Color(
    0xFFF1F5F9,
  ); // Very subtle border for white backgrounds

  // Text Colors
  static const Color textPrimary = Color(0xFFFFFFFF); // (Dark)
  static const Color textSecondary = Color(0xFFB3B3B3); // (Dark)
  static const Color textMuted = Color(0xFF808080); // (Dark)

  // Text Colors (Light)
  static const Color textPrimaryLight = Color(0xFF146EEC);
  static const Color textSecondaryLight = Color(0xFF555555);
  static const Color textMutedLight = Color(0xFF777777);

  // Status Colors
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
}
