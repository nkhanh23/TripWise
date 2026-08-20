import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';

/// Reusable inline error banner for forms, network errors, and failed loads.
class TWErrorBanner extends StatelessWidget {
  const TWErrorBanner({
    super.key,
    required this.message,
    this.title,
    this.icon = Icons.error_outline,
    this.onRetry,
    this.onDismiss,
    this.retryLabel = 'Retry',
  });

  final String message;
  final String? title;
  final IconData icon;
  final VoidCallback? onRetry;
  final VoidCallback? onDismiss;
  final String retryLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: AppSpacing.edgeInsetsMd,
      decoration: BoxDecoration(
        color: AppColors.errorContainer.withValues(alpha: 0.7),
        borderRadius: AppRadius.borderMd,
        border: Border.all(
          color: AppColors.error.withValues(alpha: 0.3),
          width: 1.0,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 20.0,
            color: AppColors.error,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (title != null) ...[
                  Text(
                    title!,
                    style: AppTypography.labelLarge.copyWith(
                      color: AppColors.onErrorContainer,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2.0),
                ],
                Text(
                  message,
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.onErrorContainer,
                  ),
                ),
                if (onRetry != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  InkWell(
                    onTap: onRetry,
                    child: Text(
                      retryLabel,
                      style: AppTypography.labelMedium.copyWith(
                        color: AppColors.error,
                        fontWeight: FontWeight.w700,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (onDismiss != null)
            InkWell(
              onTap: onDismiss,
              child: const Padding(
                padding: EdgeInsets.all(2.0),
                child: Icon(
                  Icons.close,
                  size: 16.0,
                  color: AppColors.onErrorContainer,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Lightweight toast / snackbar helper without external dependencies.
class TWSnackbar {
  TWSnackbar._();

  static void show(
    BuildContext context, {
    required String message,
    bool isError = false,
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(seconds: 3),
  }) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;

    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: AppTypography.bodyMedium.copyWith(
            color: isError ? AppColors.onError : AppColors.onSurface,
          ),
        ),
        backgroundColor:
            isError ? AppColors.error : AppColors.surfaceContainerLowest,
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.borderMd,
        ),
        duration: duration,
        action: actionLabel != null && onAction != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: isError ? AppColors.onError : AppColors.primary,
                onPressed: onAction,
              )
            : null,
      ),
    );
  }
}
