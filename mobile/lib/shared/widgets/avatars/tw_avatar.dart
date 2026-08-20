import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// Predefined size tiers for [TWAvatar].
enum TWAvatarSize {
  xs(dimension: 24.0, fontSize: 10.0, iconSize: 14.0),
  sm(dimension: 32.0, fontSize: 12.0, iconSize: 18.0),
  md(dimension: 40.0, fontSize: 14.0, iconSize: 22.0),
  lg(dimension: 56.0, fontSize: 18.0, iconSize: 30.0),
  xl(dimension: 72.0, fontSize: 24.0, iconSize: 38.0);

  const TWAvatarSize({
    required this.dimension,
    required this.fontSize,
    required this.iconSize,
  });

  final double dimension;
  final double fontSize;
  final double iconSize;
}

/// Production-ready Avatar supporting local/network images, initials, and icon fallbacks.
class TWAvatar extends StatelessWidget {
  const TWAvatar({
    super.key,
    this.imageUrl,
    this.initials,
    this.fallbackIcon = Icons.person,
    this.size = TWAvatarSize.md,
    this.backgroundColor,
    this.foregroundColor,
    this.borderColor,
    this.borderWidth = 2.0,
  });

  final String? imageUrl;
  final String? initials;
  final IconData fallbackIcon;
  final TWAvatarSize size;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final Color? borderColor;
  final double borderWidth;

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? AppColors.primaryFixed;
    final fgColor = foregroundColor ?? AppColors.onPrimaryFixed;

    Widget content;
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      content = Image.network(
        imageUrl!,
        width: size.dimension,
        height: size.dimension,
        fit: BoxFit.cover,
        cacheWidth: (size.dimension * 2).toInt(),
        cacheHeight: (size.dimension * 2).toInt(),
        errorBuilder: (context, error, stackTrace) =>
            _buildFallback(bgColor, fgColor),
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
            color: AppColors.surfaceContainerHigh,
            width: size.dimension,
            height: size.dimension,
          );
        },
      );
    } else {
      content = _buildFallback(bgColor, fgColor);
    }

    return Container(
      width: size.dimension,
      height: size.dimension,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        border: borderColor != null
            ? Border.all(
                color: borderColor!,
                width: borderWidth,
              )
            : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: Center(child: content),
    );
  }

  Widget _buildFallback(Color bgColor, Color fgColor) {
    if (initials != null && initials!.trim().isNotEmpty) {
      final cleanInitials = initials!.trim().toUpperCase();
      final displayInitials = cleanInitials.length > 2
          ? cleanInitials.substring(0, 2)
          : cleanInitials;
      return Text(
        displayInitials,
        style: AppTypography.labelMedium.copyWith(
          fontSize: size.fontSize,
          fontWeight: FontWeight.w700,
          color: fgColor,
        ),
      );
    }
    return Icon(
      fallbackIcon,
      size: size.iconSize,
      color: fgColor,
    );
  }
}

/// Production-ready overlapping avatar cluster for trip companions or group members.
class TWAvatarGroup extends StatelessWidget {
  const TWAvatarGroup({
    super.key,
    required this.avatars,
    this.maxVisible = 3,
    this.size = TWAvatarSize.sm,
    this.overlap = 10.0,
    this.overflowBackgroundColor,
    this.overflowForegroundColor,
  });

  final List<TWAvatar> avatars;
  final int maxVisible;
  final TWAvatarSize size;
  final double overlap;
  final Color? overflowBackgroundColor;
  final Color? overflowForegroundColor;

  @override
  Widget build(BuildContext context) {
    if (avatars.isEmpty) {
      return const SizedBox.shrink();
    }

    final visibleAvatars = avatars.take(maxVisible).toList();
    final overflowCount = avatars.length - maxVisible;

    final items = <Widget>[];
    for (var i = 0; i < visibleAvatars.length; i++) {
      final avatar = visibleAvatars[i];
      items.add(
        Align(
          alignment: Alignment.centerLeft,
          widthFactor: (i == visibleAvatars.length - 1 && overflowCount == 0)
              ? 1.0
              : 0.75,
          child: TWAvatar(
            key: avatar.key,
            imageUrl: avatar.imageUrl,
            initials: avatar.initials,
            fallbackIcon: avatar.fallbackIcon,
            size: size,
            backgroundColor: avatar.backgroundColor,
            foregroundColor: avatar.foregroundColor,
            borderColor: AppColors.surfaceContainerLowest,
            borderWidth: 2.0,
          ),
        ),
      );
    }

    if (overflowCount > 0) {
      final overflowBg =
          overflowBackgroundColor ?? AppColors.surfaceContainerHighest;
      final overflowFg = overflowForegroundColor ?? AppColors.onSurfaceVariant;
      items.add(
        Align(
          alignment: Alignment.centerLeft,
          widthFactor: 1.0,
          child: Container(
            width: size.dimension,
            height: size.dimension,
            decoration: BoxDecoration(
              color: overflowBg,
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.surfaceContainerLowest,
                width: 2.0,
              ),
            ),
            child: Center(
              child: Text(
                '+$overflowCount',
                style: AppTypography.caption.copyWith(
                  fontSize: size.fontSize - 1,
                  fontWeight: FontWeight.w700,
                  color: overflowFg,
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: items,
    );
  }
}
