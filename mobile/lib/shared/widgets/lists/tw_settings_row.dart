import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';

/// Reusable list row for user settings, profile menus, and toggle controls.
class TWSettingsRow extends StatelessWidget {
  const TWSettingsRow({
    super.key,
    required this.title,
    this.subtitle,
    this.leadingIcon,
    this.leadingIconColor,
    this.leadingIconBackgroundColor,
    this.trailingValue,
    this.trailing,
    this.showChevron = false,
    this.switchValue,
    this.onSwitchChanged,
    this.onTap,
    this.enabled = true,
  });

  final String title;
  final String? subtitle;
  final IconData? leadingIcon;
  final Color? leadingIconColor;
  final Color? leadingIconBackgroundColor;
  final String? trailingValue;
  final Widget? trailing;
  final bool showChevron;
  final bool? switchValue;
  final ValueChanged<bool>? onSwitchChanged;
  final VoidCallback? onTap;
  final bool enabled;

  bool get _isInteractive =>
      enabled && (onTap != null || onSwitchChanged != null);

  @override
  Widget build(BuildContext context) {
    Widget? leadingWidget;
    if (leadingIcon != null) {
      final iconColor =
          leadingIconColor ?? (enabled ? AppColors.primary : AppColors.outline);
      final iconBg = leadingIconBackgroundColor ??
          (enabled
              ? AppColors.primaryFixed.withValues(alpha: 0.35)
              : AppColors.surfaceContainerLow);

      leadingWidget = Container(
        width: 36.0,
        height: 36.0,
        decoration: BoxDecoration(
          color: iconBg,
          borderRadius: AppRadius.borderMd,
        ),
        child: Center(
          child: Icon(
            leadingIcon,
            size: 20.0,
            color: iconColor,
          ),
        ),
      );
    }

    Widget? trailingWidget;
    if (switchValue != null) {
      trailingWidget = Switch.adaptive(
        value: switchValue!,
        onChanged: enabled ? onSwitchChanged : null,
        activeTrackColor: AppColors.primary,
      );
    } else if (trailing != null) {
      trailingWidget = trailing;
    } else if (trailingValue != null || showChevron) {
      trailingWidget = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingValue != null) ...[
            Text(
              trailingValue!,
              style: AppTypography.bodyMedium.copyWith(
                color: enabled ? AppColors.onSurfaceVariant : AppColors.outline,
              ),
            ),
            if (showChevron) const SizedBox(width: AppSpacing.xs),
          ],
          if (showChevron)
            Icon(
              Icons.chevron_right,
              size: 20.0,
              color: enabled ? AppColors.outline : AppColors.outlineVariant,
            ),
        ],
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _isInteractive
            ? () {
                if (switchValue != null && onSwitchChanged != null) {
                  onSwitchChanged!(!switchValue!);
                } else if (onTap != null) {
                  onTap!();
                }
              }
            : null,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52.0),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              children: [
                if (leadingWidget != null) ...[
                  leadingWidget,
                  const SizedBox(width: AppSpacing.md),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        title,
                        style: AppTypography.bodyLarge.copyWith(
                          color:
                              enabled ? AppColors.onSurface : AppColors.outline,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2.0),
                        Text(
                          subtitle!,
                          style: AppTypography.bodySmall.copyWith(
                            color: enabled
                                ? AppColors.onSurfaceVariant
                                : AppColors.outlineVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailingWidget != null) ...[
                  const SizedBox(width: AppSpacing.md),
                  trailingWidget,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
