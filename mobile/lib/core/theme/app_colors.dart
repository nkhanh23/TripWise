import 'package:flutter/material.dart';

/// Centralized color palette extracted from TripWise Stitch design system.
class AppColors {
  AppColors._();

  // Primary Brand Colors
  static const Color primary = Color(0xFF0058BC); // Bright Travel Blue
  static const Color primaryContainer =
      Color(0xFF0070EB); // Active CTA / Highlight
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onPrimaryContainer = Color(0xFFFEFCFF);
  static const Color primaryFixed = Color(0xFFD8E2FF);
  static const Color primaryFixedDim = Color(0xFFADC6FF);
  static const Color onPrimaryFixed = Color(0xFF001A41);
  static const Color onPrimaryFixedVariant = Color(0xFF004493);

  // Surface & Canvas (Warm Light Mode)
  static const Color background = Color(0xFFFCF9F8); // Warm soft canvas
  static const Color surface = Color(0xFFFCF9F8);
  static const Color surfaceDim = Color(0xFFDCD9D9);
  static const Color surfaceBright = Color(0xFFFCF9F8);
  static const Color surfaceContainerLowest =
      Color(0xFFFFFFFF); // Elevated cards & sheets
  static const Color surfaceContainerLow = Color(0xFFF6F3F2);
  static const Color surfaceContainer = Color(0xFFF0EDED);
  static const Color surfaceContainerHigh = Color(0xFFEAE7E7);
  static const Color surfaceContainerHighest = Color(0xFFE5E2E1);
  static const Color surfaceVariant = Color(0xFFE5E2E1);

  // Content & Typography
  static const Color onSurface =
      Color(0xFF1C1B1B); // High contrast headline / body
  static const Color onSurfaceVariant =
      Color(0xFF414755); // Subtitle / secondary label
  static const Color onBackground = Color(0xFF1C1B1B);
  static const Color outline = Color(0xFF717786); // Active borders & icons
  static const Color outlineVariant =
      Color(0xFFC1C6D7); // Dividers & subtle strokes

  // Secondaries
  static const Color secondary = Color(0xFF54606B);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFD8E4F2);
  static const Color onSecondaryContainer = Color(0xFF5A6671);
  static const Color secondaryFixed = Color(0xFFD8E4F2);
  static const Color secondaryFixedDim = Color(0xFFBCC8D5);
  static const Color onSecondaryFixed = Color(0xFF111D26);

  // Tertiaries & Accents
  static const Color tertiary = Color(0xFFBC000A); // Ratings, map alerts
  static const Color onTertiary = Color(0xFFFFFFFF);
  static const Color tertiaryContainer = Color(0xFFE2241F);
  static const Color onTertiaryContainer = Color(0xFFFFBFFF);
  static const Color tertiaryFixed = Color(0xFFFFDAD5);
  static const Color tertiaryFixedDim = Color(0xFFFFB4AA);
  static const Color onTertiaryFixed = Color(0xFF410001);
  static const Color onTertiaryFixedVariant = Color(0xFF930005);

  // Status & Feedback
  static const Color error = Color(0xFFBA1A1A);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color errorContainer = Color(0xFFFFDAD6);
  static const Color onErrorContainer = Color(0xFF93000A);

  static const Color success = Color(0xFF2E7D32);
  static const Color successContainer = Color(0xFFE8F5E9);
  static const Color warning = Color(0xFFED6C02);
  static const Color warningContainer = Color(0xFFFFF3E0);
}
