import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../buttons/tw_button.dart';

/// Universal empty state presentation widget for lists, searches, and uninitialized screens.
class TWEmptyState extends StatelessWidget {
  const TWEmptyState({
    super.key,
    required this.title,
    this.description,
    this.icon,
    this.illustration,
    this.primaryActionLabel,
    this.onPrimaryAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
    this.padding = AppSpacing.edgeInsetsXxl,
  });

  final String title;
  final String? description;
  final IconData? icon;
  final Widget? illustration;
  final String? primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (illustration != null) ...[
                illustration!,
                const SizedBox(height: AppSpacing.xl),
              ] else if (icon != null) ...[
                Container(
                  width: 72.0,
                  height: 72.0,
                  decoration: BoxDecoration(
                    color: AppColors.primaryFixed.withValues(alpha: 0.35),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      icon,
                      size: 36.0,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
              Text(
                title,
                style: AppTypography.titleMedium.copyWith(
                  color: AppColors.onSurface,
                ),
                textAlign: TextAlign.center,
              ),
              if (description != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  description!,
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
              if (primaryActionLabel != null && onPrimaryAction != null) ...[
                const SizedBox(height: AppSpacing.xxl),
                TWButton(
                  label: primaryActionLabel!,
                  onPressed: onPrimaryAction,
                  size: TWButtonSize.md,
                ),
              ],
              if (secondaryActionLabel != null &&
                  onSecondaryAction != null) ...[
                const SizedBox(height: AppSpacing.sm),
                TWButton(
                  label: secondaryActionLabel!,
                  onPressed: onSecondaryAction,
                  variant: TWButtonVariant.outline,
                  size: TWButtonSize.md,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
