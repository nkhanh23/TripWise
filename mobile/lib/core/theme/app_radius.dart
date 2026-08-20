import 'package:flutter/material.dart';

/// Centralized corner radius tokens for TripWise.
class AppRadius {
  AppRadius._();

  /// 4.0 - Small radius (status indicators, tooltips)
  static const double sm = 4.0;

  /// 8.0 - Medium radius (standard buttons, inputs, icon containers)
  static const double md = 8.0;

  /// 12.0 - Large radius (standard place/trip/route cards)
  static const double lg = 12.0;

  /// 16.0 - Extra large radius (bottom sheet top corners, modal dialogs)
  static const double xl = 16.0;

  /// 24.0 - 2X Large radius (floating HUD panels, hero containers)
  static const double xxl = 24.0;

  /// 9999.0 - Pill / circular radius (chips, pill buttons, avatars)
  static const double pill = 9999.0;

  // Radius helpers
  static const Radius radiusSm = Radius.circular(sm);
  static const Radius radiusMd = Radius.circular(md);
  static const Radius radiusLg = Radius.circular(lg);
  static const Radius radiusXl = Radius.circular(xl);
  static const Radius radiusXxl = Radius.circular(xxl);
  static const Radius radiusPill = Radius.circular(pill);

  // BorderRadius helpers
  static const BorderRadius borderSm = BorderRadius.all(radiusSm);
  static const BorderRadius borderMd = BorderRadius.all(radiusMd);
  static const BorderRadius borderLg = BorderRadius.all(radiusLg);
  static const BorderRadius borderXl = BorderRadius.all(radiusXl);
  static const BorderRadius borderXxl = BorderRadius.all(radiusXxl);
  static const BorderRadius borderPill = BorderRadius.all(radiusPill);

  // Top-only BorderRadius (for bottom sheets & modals)
  static const BorderRadius topLg = BorderRadius.vertical(top: radiusLg);
  static const BorderRadius topXl = BorderRadius.vertical(top: radiusXl);
  static const BorderRadius topXxl = BorderRadius.vertical(top: radiusXxl);
}
