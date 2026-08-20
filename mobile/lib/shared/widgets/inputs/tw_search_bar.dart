import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_shadows.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';

/// Lightweight search bar designed for Map overlays, Explore search, and saved lists.
class TWSearchBar extends StatelessWidget {
  const TWSearchBar({
    super.key,
    this.controller,
    this.hintText = 'Search destinations, places...',
    this.onQueryChanged,
    this.onSubmitted,
    this.onTap,
    this.onFilterTap,
    this.onClearTap,
    this.trailing,
    this.readOnly = false,
    this.enabled = true,
    this.autofocus = false,
    this.focusNode,
    this.isFloating = true,
  });

  final TextEditingController? controller;
  final String hintText;
  final ValueChanged<String>? onQueryChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onTap;
  final VoidCallback? onFilterTap;
  final VoidCallback? onClearTap;
  final Widget? trailing;
  final bool readOnly;
  final bool enabled;
  final bool autofocus;
  final FocusNode? focusNode;
  final bool isFloating;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48.0,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: AppRadius.borderPill,
        boxShadow: isFloating ? AppShadows.level2 : null,
        border: isFloating
            ? null
            : Border.all(
                color: AppColors.outlineVariant.withValues(alpha: 0.6),
                width: 1.0,
              ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: AppRadius.borderPill,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: readOnly ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Row(
              children: [
                const Icon(
                  Icons.search,
                  size: 20.0,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: TextField(
                    controller: controller,
                    focusNode: focusNode,
                    readOnly: readOnly,
                    enabled: enabled,
                    autofocus: autofocus,
                    onTap: onTap,
                    onChanged: onQueryChanged,
                    onSubmitted: onSubmitted,
                    style: AppTypography.bodyMedium.copyWith(
                      color: AppColors.onSurface,
                    ),
                    decoration: InputDecoration(
                      hintText: hintText,
                      hintStyle: AppTypography.bodyMedium.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                      isDense: true,
                      filled: false,
                      contentPadding: EdgeInsets.zero,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                    ),
                  ),
                ),
                if (onClearTap != null)
                  IconButton(
                    icon: const Icon(
                      Icons.close,
                      size: 18.0,
                      color: AppColors.onSurfaceVariant,
                    ),
                    onPressed: onClearTap,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 32.0,
                      minHeight: 32.0,
                    ),
                    splashRadius: 18.0,
                  ),
                if (onFilterTap != null) ...[
                  Container(
                    height: 20.0,
                    width: 1.0,
                    color: AppColors.outlineVariant,
                    margin:
                        const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                  ),
                  IconButton(
                    icon: const Icon(
                      Icons.tune,
                      size: 18.0,
                      color: AppColors.primary,
                    ),
                    onPressed: onFilterTap,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 36.0,
                      minHeight: 36.0,
                    ),
                    splashRadius: 18.0,
                  ),
                ],
                if (trailing != null) trailing!,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
