import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripwise_mobile/app/app.dart';
import 'package:tripwise_mobile/core/theme/app_colors.dart';
import 'package:tripwise_mobile/core/theme/app_radius.dart';
import 'package:tripwise_mobile/core/theme/app_shadows.dart';
import 'package:tripwise_mobile/core/theme/app_spacing.dart';
import 'package:tripwise_mobile/core/theme/app_theme.dart';
import 'package:tripwise_mobile/core/theme/app_typography.dart';

void main() {
  group('Phase 1 Design System Tokens Unit Tests', () {
    test('AppColors contains valid Stitch primary and surface tokens', () {
      expect(AppColors.primary, const Color(0xFF0058BC));
      expect(AppColors.primaryContainer, const Color(0xFF0070EB));
      expect(AppColors.background, const Color(0xFFFCF9F8));
      expect(AppColors.surfaceContainerLowest, const Color(0xFFFFFFFF));
      expect(AppColors.onSurface, const Color(0xFF1C1B1B));
    });

    test('AppSpacing adheres strictly to 8pt grid values', () {
      expect(AppSpacing.xs, 4.0);
      expect(AppSpacing.sm, 8.0);
      expect(AppSpacing.md, 12.0);
      expect(AppSpacing.lg, 16.0);
      expect(AppSpacing.xl, 20.0);
      expect(AppSpacing.xxl, 24.0);
      expect(AppSpacing.xxxl, 32.0);
    });

    test('AppRadius provides documented corner radius constants', () {
      expect(AppRadius.sm, 4.0);
      expect(AppRadius.md, 8.0);
      expect(AppRadius.lg, 12.0);
      expect(AppRadius.xl, 16.0);
      expect(AppRadius.xxl, 24.0);
      expect(AppRadius.pill, 9999.0);
    });

    test('AppShadows contains 3 ambient elevation levels', () {
      expect(AppShadows.level1, isNotEmpty);
      expect(AppShadows.level2, isNotEmpty);
      expect(AppShadows.level3, isNotEmpty);
    });

    test('AppTypography provides Inter scale text styles', () {
      expect(AppTypography.display.fontSize, 32);
      expect(AppTypography.titleLarge.fontSize, 22);
      expect(AppTypography.titleMedium.fontSize, 18);
      expect(AppTypography.titleSmall.fontSize, 16);
      expect(AppTypography.bodyLarge.fontSize, 16);
      expect(AppTypography.bodyMedium.fontSize, 14);
      expect(AppTypography.bodySmall.fontSize, 12);
      expect(AppTypography.labelLarge.fontSize, 14);
      expect(AppTypography.labelMedium.fontSize, 12);
      expect(AppTypography.caption.fontSize, 11);
    });

    test('AppTheme generates ThemeData with correct primary and background',
        () {
      final theme = AppTheme.lightTheme;
      expect(theme.colorScheme.primary, AppColors.primary);
      expect(theme.scaffoldBackgroundColor, AppColors.background);
      expect(theme.useMaterial3, true);
    });
  });

  group('TripWiseApp Widget Smoke Test', () {
    testWidgets('Renders placeholder with Phase 2 shared components ready',
        (WidgetTester tester) async {
      await tester.pumpWidget(const TripWiseApp());
      expect(find.text('TripWise UI Foundation'), findsOneWidget);
      expect(find.text('Phase 2 Shared Components Ready'), findsOneWidget);
      expect(find.text('Open Component Preview'), findsOneWidget);
      expect(find.byIcon(Icons.flight_takeoff), findsOneWidget);
    });
  });
}
