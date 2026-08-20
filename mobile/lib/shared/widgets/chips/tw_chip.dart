import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';

/// Supported visual variants for [TWChip].
enum TWChipVariant {
  choice,
  filter,
  status,
}

/// Production-ready chip / pill component for category selection, filters, and status badges.
class TWChip extends StatelessWidget {
  const TWChip({
    super.key,
    required this.label,
    this.icon,
    this.isSelected = false,
    this.onSelected,
    this.onTap,
    this.variant = TWChipVariant.choice,
    this.enabled = true,
    this.customColor,
  });

  final String label;
  final IconData? icon;
  final bool isSelected;
  final ValueChanged<bool>? onSelected;
  final VoidCallback? onTap;
  final TWChipVariant variant;
  final bool enabled;
  final Color? customColor;

  bool get _isInteractive => enabled && (onSelected != null || onTap != null);

  Color _getBackgroundColor() {
    if (!enabled) {
      return AppColors.surfaceContainerLow;
    }
    if (customColor != null) {
      return isSelected ? customColor! : customColor!.withValues(alpha: 0.12);
    }
    switch (variant) {
      case TWChipVariant.choice:
      case TWChipVariant.filter:
        return isSelected
            ? AppColors.primary
            : AppColors.surfaceContainerLowest;
      case TWChipVariant.status:
        return AppColors.secondaryContainer.withValues(alpha: 0.6);
    }
  }

  Color _getForegroundColor() {
    if (!enabled) {
      return AppColors.outline;
    }
    if (customColor != null) {
      return isSelected ? AppColors.onPrimary : customColor!;
    }
    switch (variant) {
      case TWChipVariant.choice:
      case TWChipVariant.filter:
        return isSelected ? AppColors.onPrimary : AppColors.onSurface;
      case TWChipVariant.status:
        return AppColors.onSecondaryContainer;
    }
  }

  BorderSide _getBorderSide() {
    if (!enabled) {
      return BorderSide(
        color: AppColors.outlineVariant.withValues(alpha: 0.3),
        width: 1.0,
      );
    }
    if (isSelected || variant == TWChipVariant.status) {
      return BorderSide.none;
    }
    return const BorderSide(
      color: AppColors.outlineVariant,
      width: 1.0,
    );
  }

  void _handleTap() {
    if (!_isInteractive) return;
    if (onSelected != null) {
      onSelected!(!isSelected);
    } else if (onTap != null) {
      onTap!();
    }
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = _getBackgroundColor();
    final fgColor = _getForegroundColor();
    final border = _getBorderSide();

    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (variant == TWChipVariant.filter && isSelected) ...[
          Icon(
            Icons.check,
            size: 14.0,
            color: fgColor,
          ),
          const SizedBox(width: AppSpacing.xs),
        ] else if (icon != null) ...[
          Icon(
            icon,
            size: 14.0,
            color: fgColor,
          ),
          const SizedBox(width: AppSpacing.xs),
        ],
        Text(
          label,
          style: AppTypography.labelMedium.copyWith(
            color: fgColor,
          ),
        ),
      ],
    );

    return Material(
      color: bgColor,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.borderPill,
        side: border,
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: _isInteractive ? _handleTap : null,
        borderRadius: AppRadius.borderPill,
        child: Container(
          height: 32.0,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.xs,
          ),
          alignment: Alignment.center,
          child: content,
        ),
      ),
    );
  }
}
