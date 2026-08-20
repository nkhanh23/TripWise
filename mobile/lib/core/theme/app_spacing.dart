import 'package:flutter/material.dart';

/// Centralized 8pt spatial grid scale for TripWise.
class AppSpacing {
  AppSpacing._();

  /// 4.0 - Extra small spacing (icon-to-text, tight chips)
  static const double xs = 4.0;

  /// 8.0 - Small spacing (chip padding, micro gutters)
  static const double sm = 8.0;

  /// 12.0 - Medium spacing (input vertical padding, button gap)
  static const double md = 12.0;

  /// 16.0 - Large spacing (standard screen margin, card padding)
  static const double lg = 16.0;

  /// 20.0 - Extra large spacing (section gap, sheet padding)
  static const double xl = 20.0;

  /// 24.0 - 2X Large spacing (hero padding, major section gap)
  static const double xxl = 24.0;

  /// 32.0 - 3X Large spacing (empty state vertical margin, container padding)
  static const double xxxl = 32.0;

  // EdgeInsets helpers
  static const EdgeInsets edgeInsetsXs = EdgeInsets.all(xs);
  static const EdgeInsets edgeInsetsSm = EdgeInsets.all(sm);
  static const EdgeInsets edgeInsetsMd = EdgeInsets.all(md);
  static const EdgeInsets edgeInsetsLg = EdgeInsets.all(lg);
  static const EdgeInsets edgeInsetsXl = EdgeInsets.all(xl);
  static const EdgeInsets edgeInsetsXxl = EdgeInsets.all(xxl);

  // Horizontal EdgeInset helpers
  static const EdgeInsets horizontalXs = EdgeInsets.symmetric(horizontal: xs);
  static const EdgeInsets horizontalSm = EdgeInsets.symmetric(horizontal: sm);
  static const EdgeInsets horizontalMd = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets horizontalLg = EdgeInsets.symmetric(horizontal: lg);
  static const EdgeInsets horizontalXl = EdgeInsets.symmetric(horizontal: xl);
  static const EdgeInsets horizontalXxl = EdgeInsets.symmetric(horizontal: xxl);

  // Vertical EdgeInset helpers
  static const EdgeInsets verticalXs = EdgeInsets.symmetric(vertical: xs);
  static const EdgeInsets verticalSm = EdgeInsets.symmetric(vertical: sm);
  static const EdgeInsets verticalMd = EdgeInsets.symmetric(vertical: md);
  static const EdgeInsets verticalLg = EdgeInsets.symmetric(vertical: lg);
  static const EdgeInsets verticalXl = EdgeInsets.symmetric(vertical: xl);
  static const EdgeInsets verticalXxl = EdgeInsets.symmetric(vertical: xxl);
}
