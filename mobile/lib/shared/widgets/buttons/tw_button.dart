import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';

/// Supported visual variants for [TWButton].
enum TWButtonVariant {
  primary,
  secondary,
  outline,
  tonal,
  danger,
}

/// Supported size tiers for [TWButton].
enum TWButtonSize {
  sm(height: 36, horizontalPadding: AppSpacing.md, iconSize: 16),
  md(height: 44, horizontalPadding: AppSpacing.lg, iconSize: 20),
  lg(height: 52, horizontalPadding: AppSpacing.xl, iconSize: 22);

  const TWButtonSize({
    required this.height,
    required this.horizontalPadding,
    required this.iconSize,
  });

  final double height;
  final double horizontalPadding;
  final double iconSize;
}

/// Production-ready, universal action button for TripWise.
class TWButton extends StatelessWidget {
  const TWButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = TWButtonVariant.primary,
    this.size = TWButtonSize.md,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final TWButtonVariant variant;
  final TWButtonSize size;
  final IconData? leadingIcon;
  final IconData? trailingIcon;
  final bool isLoading;
  final bool isFullWidth;

  bool get _isEnabled => onPressed != null && !isLoading;

  Color _getBackgroundColor(BuildContext context) {
    if (!_isEnabled) {
      if (variant == TWButtonVariant.outline) {
        return Colors.transparent;
      }
      return AppColors.surfaceContainerHigh;
    }
    switch (variant) {
      case TWButtonVariant.primary:
        return AppColors.primary;
      case TWButtonVariant.secondary:
        return AppColors.secondaryContainer;
      case TWButtonVariant.outline:
        return Colors.transparent;
      case TWButtonVariant.tonal:
        return AppColors.primaryFixed;
      case TWButtonVariant.danger:
        return AppColors.error;
    }
  }

  Color _getForegroundColor(BuildContext context) {
    if (!_isEnabled) {
      return AppColors.outline;
    }
    switch (variant) {
      case TWButtonVariant.primary:
        return AppColors.onPrimary;
      case TWButtonVariant.secondary:
        return AppColors.onSecondaryContainer;
      case TWButtonVariant.outline:
        return AppColors.onSurface;
      case TWButtonVariant.tonal:
        return AppColors.onPrimaryFixed;
      case TWButtonVariant.danger:
        return AppColors.onError;
    }
  }

  BorderSide? _getBorderSide(BuildContext context) {
    if (variant == TWButtonVariant.outline) {
      return BorderSide(
        color: _isEnabled
            ? AppColors.outlineVariant
            : AppColors.surfaceContainerHighest,
        width: 1.0,
      );
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = _getBackgroundColor(context);
    final fgColor = _getForegroundColor(context);
    final borderSide = _getBorderSide(context);

    Widget content;
    if (isLoading) {
      content = SizedBox(
        width: size.iconSize,
        height: size.iconSize,
        child: CircularProgressIndicator(
          strokeWidth: 2.0,
          valueColor: AlwaysStoppedAnimation<Color>(fgColor),
        ),
      );
    } else {
      final textStyle = (size == TWButtonSize.sm
              ? AppTypography.labelMedium
              : AppTypography.labelLarge)
          .copyWith(color: fgColor);

      content = Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (leadingIcon != null) ...[
            Icon(
              leadingIcon,
              size: size.iconSize,
              color: fgColor,
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          Flexible(
            child: Text(
              label,
              style: textStyle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (trailingIcon != null) ...[
            const SizedBox(width: AppSpacing.sm),
            Icon(
              trailingIcon,
              size: size.iconSize,
              color: fgColor,
            ),
          ],
        ],
      );
    }

    final button = Material(
      color: bgColor,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.borderMd,
        side: borderSide ?? BorderSide.none,
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: _isEnabled ? onPressed : null,
        borderRadius: AppRadius.borderMd,
        child: Container(
          height: size.height,
          padding: EdgeInsets.symmetric(horizontal: size.horizontalPadding),
          alignment: Alignment.center,
          child: content,
        ),
      ),
    );

    if (isFullWidth) {
      return SizedBox(
        width: double.infinity,
        child: button,
      );
    }

    return button;
  }
}
