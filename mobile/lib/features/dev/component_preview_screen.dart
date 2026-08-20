import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../shared/widgets/avatars/tw_avatar.dart';
import '../../shared/widgets/buttons/tw_button.dart';
import '../../shared/widgets/buttons/tw_icon_button.dart';
import '../../shared/widgets/chips/tw_chip.dart';
import '../../shared/widgets/feedback/tw_empty_state.dart';
import '../../shared/widgets/feedback/tw_error_banner.dart';
import '../../shared/widgets/feedback/tw_loading.dart';
import '../../shared/widgets/inputs/tw_search_bar.dart';
import '../../shared/widgets/inputs/tw_text_field.dart';
import '../../shared/widgets/lists/tw_settings_row.dart';

/// Development catalog screen showcasing all Phase 2 shared components and states.
class ComponentPreviewScreen extends StatefulWidget {
  const ComponentPreviewScreen({super.key});

  @override
  State<ComponentPreviewScreen> createState() => _ComponentPreviewScreenState();
}

class _ComponentPreviewScreenState extends State<ComponentPreviewScreen> {
  bool _switchValue = true;
  bool _chipSelected = true;
  String _selectedCategory = 'Temples';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TripWise Components Catalog'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        children: [
          _buildSectionHeader('1. Buttons (TWButton)'),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              TWButton(
                label: 'Primary MD',
                onPressed: () {},
              ),
              TWButton(
                label: 'Secondary',
                variant: TWButtonVariant.secondary,
                onPressed: () {},
              ),
              TWButton(
                label: 'Outline',
                variant: TWButtonVariant.outline,
                onPressed: () {},
              ),
              TWButton(
                label: 'Tonal',
                variant: TWButtonVariant.tonal,
                onPressed: () {},
              ),
              TWButton(
                label: 'Danger',
                variant: TWButtonVariant.danger,
                onPressed: () {},
              ),
              const TWButton(
                label: 'Disabled',
                onPressed: null,
              ),
              TWButton(
                label: 'Loading',
                isLoading: true,
                onPressed: () {},
              ),
              TWButton(
                label: 'With Icon',
                leadingIcon: Icons.add,
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('2. Icon Buttons (TWIconButton)'),
          Row(
            children: [
              TWIconButton(
                icon: Icons.bookmark_border,
                tooltip: 'Save',
                onPressed: () {},
              ),
              const SizedBox(width: AppSpacing.sm),
              TWIconButton(
                icon: Icons.bookmark,
                isSelected: true,
                tooltip: 'Saved',
                onPressed: () {},
              ),
              const SizedBox(width: AppSpacing.sm),
              TWIconButton(
                icon: Icons.share,
                variant: TWIconButtonVariant.ghost,
                onPressed: () {},
              ),
              const SizedBox(width: AppSpacing.sm),
              TWIconButton(
                icon: Icons.navigation,
                variant: TWIconButtonVariant.primary,
                onPressed: () {},
              ),
              const SizedBox(width: AppSpacing.sm),
              const TWIconButton(
                icon: Icons.close,
                onPressed: null,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('3. Text Fields (TWTextField)'),
          const TWTextField(
            label: 'Destination',
            hintText: 'e.g. Bangkok, Thailand',
            prefixIcon: Icons.search,
          ),
          const SizedBox(height: AppSpacing.md),
          const TWTextField(
            label: 'Password',
            hintText: 'Enter password',
            obscureText: true,
            prefixIcon: Icons.lock_outline,
          ),
          const SizedBox(height: AppSpacing.md),
          const TWTextField(
            label: 'Email with Error',
            hintText: 'user@example.com',
            errorText: 'Invalid email address format',
            prefixIcon: Icons.email_outlined,
          ),
          const SizedBox(height: AppSpacing.md),
          const TWTextField(
            label: 'Disabled Field',
            hintText: 'Locked property',
            enabled: false,
            prefixIcon: Icons.block,
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('4. Search Bars (TWSearchBar)'),
          TWSearchBar(
            hintText: 'Floating search bar (Map overlay)',
            isFloating: true,
            onFilterTap: () {},
          ),
          const SizedBox(height: AppSpacing.md),
          TWSearchBar(
            hintText: 'Inline search bar',
            isFloating: false,
            onClearTap: () {},
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('5. Chips (TWChip)'),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              TWChip(
                label: 'Temples',
                isSelected: _selectedCategory == 'Temples',
                onSelected: (val) =>
                    setState(() => _selectedCategory = 'Temples'),
              ),
              TWChip(
                label: 'Street Food',
                isSelected: _selectedCategory == 'Street Food',
                onSelected: (val) =>
                    setState(() => _selectedCategory = 'Street Food'),
              ),
              TWChip(
                label: 'Filter Active',
                variant: TWChipVariant.filter,
                isSelected: _chipSelected,
                onSelected: (val) => setState(() => _chipSelected = val),
              ),
              const TWChip(
                label: 'Open Now',
                variant: TWChipVariant.status,
              ),
              const TWChip(
                label: 'Disabled Chip',
                enabled: false,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('6. Avatars (TWAvatar & TWAvatarGroup)'),
          const Row(
            children: [
              TWAvatar(
                initials: 'NK',
                size: TWAvatarSize.md,
              ),
              SizedBox(width: AppSpacing.md),
              TWAvatar(
                fallbackIcon: Icons.flight,
                size: TWAvatarSize.lg,
              ),
              SizedBox(width: AppSpacing.lg),
              TWAvatarGroup(
                avatars: [
                  TWAvatar(initials: 'JD'),
                  TWAvatar(initials: 'AS'),
                  TWAvatar(initials: 'ML'),
                  TWAvatar(initials: 'BT'),
                  TWAvatar(initials: 'VN'),
                ],
                maxVisible: 3,
                size: TWAvatarSize.sm,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('7. Settings Rows (TWSettingsRow)'),
          Card(
            child: Column(
              children: [
                TWSettingsRow(
                  title: 'Push Notifications',
                  subtitle: 'Receive real-time trip alerts',
                  leadingIcon: Icons.notifications_outlined,
                  switchValue: _switchValue,
                  onSwitchChanged: (val) => setState(() => _switchValue = val),
                ),
                const Divider(),
                TWSettingsRow(
                  title: 'Currency',
                  trailingValue: 'USD (\$)',
                  leadingIcon: Icons.attach_money,
                  showChevron: true,
                  onTap: () {},
                ),
                const Divider(),
                const TWSettingsRow(
                  title: 'Disabled Option',
                  leadingIcon: Icons.lock_outline,
                  enabled: false,
                  showChevron: true,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('8. Loading Primitives'),
          const Row(
            children: [
              TWLoadingIndicator(size: 28.0),
              SizedBox(width: AppSpacing.md),
              TWLoadingIndicator(
                size: 20.0,
                message: 'Calculating route...',
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const TWCardSkeleton(),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('9. Error Feedback (TWErrorBanner & TWSnackbar)'),
          TWErrorBanner(
            title: 'Route Calculation Unavailable',
            message:
                'Unable to connect to OSRM routing server. Check internet connection.',
            onRetry: () {},
            onDismiss: () {},
          ),
          const SizedBox(height: AppSpacing.md),
          TWButton(
            label: 'Trigger Test Snackbar',
            variant: TWButtonVariant.outline,
            onPressed: () {
              TWSnackbar.show(
                context,
                message: 'Place saved to My Favorites!',
                actionLabel: 'VIEW',
                onAction: () {},
              );
            },
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSectionHeader('10. Empty State (TWEmptyState)'),
          TWEmptyState(
            icon: Icons.bookmark_border,
            title: 'No Saved Places Yet',
            description:
                'Places you bookmark on the Explore map will appear here.',
            primaryActionLabel: 'Explore Bangkok',
            onPrimaryAction: () {},
          ),
          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Text(
        title,
        style: AppTypography.titleSmall.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
