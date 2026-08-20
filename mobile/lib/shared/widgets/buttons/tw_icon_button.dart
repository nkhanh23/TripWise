import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_shadows.dart';

/// Supported visual variants for [TWIconButton].
enum TWIconButtonVariant {
  surface,
  ghost,
  primary,
  tonal,
}

/// Production-ready icon button with accessible touch target and elevation support.
class TWIconButton extends StatelessWidget {
  const TWIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.variant = TWIconButtonVariant.surface,
    this.size = 40.0,
    this.iconSize = 20.0,
    this.tooltip,
    this.isSelected = false,
    this.selectedIconColor,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final TWIconButtonVariant variant;
  final double size;
  final double iconSize;
  final String? tooltip;
  final bool isSelected;
  final Color? selectedIconColor;

  bool get _isEnabled => onPressed != null;

  Color _getBackgroundColor() {
    if (!_isEnabled) {
      return AppColors.surfaceContainerLow;
    }
    switch (variant) {
      case TWIconButtonVariant.surface:
        return AppColors.surfaceContainerLowest;
      case TWIconButtonVariant.ghost:
        return Colors.transparent;
      case TWIconButtonVariant.primary:
        return AppColors.primary;
      case TWIconButtonVariant.tonal:
        return AppColors.primaryFixed;
    }
  }

  Color _getForegroundColor() {
    if (!_isEnabled) {
      return AppColors.outline;
    }
    if (isSelected && selectedIconColor != null) {
      return selectedIconColor!;
    }
    switch (variant) {
      case TWIconButtonVariant.surface:
        return isSelected ? AppColors.primary : AppColors.onSurface;
      case TWIconButtonVariant.ghost:
        return isSelected ? AppColors.primary : AppColors.onSurface;
      case TWIconButtonVariant.primary:
        return AppColors.onPrimary;
      case TWIconButtonVariant.tonal:
        return AppColors.onPrimaryFixed;
    }
  }

  List<BoxShadow>? _getBoxShadows() {
    if (variant == TWIconButtonVariant.surface && _isEnabled) {
      return AppShadows.level1;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = _getBackgroundColor();
    final fgColor = _getForegroundColor();
    final shadows = _getBoxShadows();

    Widget button = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        boxShadow: shadows,
      ),
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: _isEnabled ? onPressed : null,
          customBorder: const CircleBorder(),
          child: Center(
            child: Icon(
              icon,
              size: iconSize,
              color: fgColor,
            ),
          ),
        ),
      ),
    );

    if (tooltip != null) {
      button = Tooltip(
        message: tooltip!,
        child: button,
      );
    }

    // Ensure accessible touch target of at least 44x44
    return ConstrainedBox(
      constraints: const BoxConstraints(
        minWidth: 44.0,
        minHeight: 44.0,
      ),
      child: Center(child: button),
    );
  }
}
