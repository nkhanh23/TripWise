import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Centralized typography scale for TripWise using Inter font family.
class AppTypography {
  AppTypography._();

  /// Primary font family name
  static const String fontFamily = 'Inter';

  /// Display style (32px / 40px line-height, Bold)
  static const TextStyle display = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32,
    height: 40 / 32,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.64,
    color: AppColors.onSurface,
  );

  /// Title Large style (22px / 28px line-height, SemiBold)
  static const TextStyle titleLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 22,
    height: 28 / 22,
    fontWeight: FontWeight.w600,
    color: AppColors.onSurface,
  );

  /// Title Medium style (18px / 24px line-height, SemiBold)
  static const TextStyle titleMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18,
    height: 24 / 18,
    fontWeight: FontWeight.w600,
    color: AppColors.onSurface,
  );

  /// Title Small style (16px / 22px line-height, SemiBold)
  static const TextStyle titleSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    height: 22 / 16,
    fontWeight: FontWeight.w600,
    color: AppColors.onSurface,
  );

  /// Body Large style (16px / 24px line-height, Regular)
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    height: 24 / 16,
    fontWeight: FontWeight.w400,
    color: AppColors.onSurface,
  );

  /// Body Medium style (14px / 20px line-height, Regular)
  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    height: 20 / 14,
    fontWeight: FontWeight.w400,
    color: AppColors.onSurface,
  );

  /// Body Small style (12px / 16px line-height, Regular)
  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    height: 16 / 12,
    fontWeight: FontWeight.w400,
    color: AppColors.onSurfaceVariant,
  );

  /// Label Large style (14px / 20px line-height, SemiBold)
  static const TextStyle labelLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    height: 20 / 14,
    fontWeight: FontWeight.w600,
    color: AppColors.onSurface,
  );

  /// Label Medium style (12px / 16px line-height, SemiBold)
  static const TextStyle labelMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    height: 16 / 12,
    fontWeight: FontWeight.w600,
    color: AppColors.onSurface,
  );

  /// Caption style (11px / 14px line-height, Regular)
  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    height: 14 / 11,
    fontWeight: FontWeight.w400,
    color: AppColors.onSurfaceVariant,
  );

  /// Builds a standard Material TextTheme using Inter tokens.
  static const TextTheme textTheme = TextTheme(
    displayLarge: display,
    headlineLarge: titleLarge,
    headlineMedium: titleMedium,
    headlineSmall: titleSmall,
    titleLarge: titleLarge,
    titleMedium: titleMedium,
    titleSmall: titleSmall,
    bodyLarge: bodyLarge,
    bodyMedium: bodyMedium,
    bodySmall: bodySmall,
    labelLarge: labelLarge,
    labelMedium: labelMedium,
    labelSmall: caption,
  );
}
