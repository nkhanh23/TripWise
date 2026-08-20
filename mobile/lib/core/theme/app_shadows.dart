import 'package:flutter/material.dart';

/// Centralized ambient drop shadows for TripWise.
class AppShadows {
  AppShadows._();

  /// Level 1 - Subtle elevation for cards on white surface (0px 4px 8px rgba(0, 0, 0, 0.04))
  static const List<BoxShadow> level1 = [
    BoxShadow(
      color: Color(0x0A000000),
      offset: Offset(0, 4),
      blurRadius: 8,
      spreadRadius: 0,
    ),
  ];

  /// Level 2 - Medium elevation for bottom sheets & search bars (0px 4px 16px rgba(0, 0, 0, 0.08))
  static const List<BoxShadow> level2 = [
    BoxShadow(
      color: Color(0x14000000),
      offset: Offset(0, 4),
      blurRadius: 16,
      spreadRadius: 0,
    ),
  ];

  /// Level 3 - High elevation for floating HUD controls, FAB & dialogs (0px 12px 24px rgba(0, 0, 0, 0.12))
  static const List<BoxShadow> level3 = [
    BoxShadow(
      color: Color(0x1F000000),
      offset: Offset(0, 12),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];
}
