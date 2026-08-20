import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';

/// Lightweight circular loading indicator with optional label.
class TWLoadingIndicator extends StatelessWidget {
  const TWLoadingIndicator({
    super.key,
    this.size = 24.0,
    this.strokeWidth = 2.5,
    this.color,
    this.message,
  });

  final double size;
  final double strokeWidth;
  final Color? color;
  final String? message;

  @override
  Widget build(BuildContext context) {
    final indicatorColor = color ?? AppColors.primary;

    Widget indicator = SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(
        strokeWidth: strokeWidth,
        valueColor: AlwaysStoppedAnimation<Color>(indicatorColor),
      ),
    );

    if (message != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          indicator,
          const SizedBox(height: AppSpacing.md),
          Text(
            message!,
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      );
    }

    return indicator;
  }
}

/// Lightweight static or pulsing skeleton box for cards, text blocks, and avatars.
class TWSkeleton extends StatelessWidget {
  const TWSkeleton({
    super.key,
    this.width,
    this.height = 16.0,
    this.borderRadius = AppRadius.borderMd,
    this.color,
  });

  final double? width;
  final double height;
  final BorderRadiusGeometry borderRadius;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color ?? AppColors.surfaceContainerHigh,
        borderRadius: borderRadius,
      ),
    );
  }
}

/// Composite skeleton for loading cards and list items.
class TWCardSkeleton extends StatelessWidget {
  const TWCardSkeleton({
    super.key,
    this.height = 100.0,
  });

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: AppSpacing.edgeInsetsMd,
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: AppRadius.borderLg,
      ),
      child: const Row(
        children: [
          TWSkeleton(
            width: 72.0,
            height: 72.0,
            borderRadius: AppRadius.borderMd,
          ),
          SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TWSkeleton(
                  width: double.infinity,
                  height: 16.0,
                ),
                SizedBox(height: AppSpacing.sm),
                TWSkeleton(
                  width: 140.0,
                  height: 12.0,
                ),
                SizedBox(height: AppSpacing.sm),
                TWSkeleton(
                  width: 80.0,
                  height: 12.0,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
