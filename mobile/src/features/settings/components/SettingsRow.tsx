import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { MaterialIconName } from '../types';

type Props = {
  title: string;
  iconName: MaterialIconName;
  subtitle?: string;
  value?: string;
  isDestructive?: boolean;
  showChevron?: boolean;
  showDivider?: boolean;
  onPress?: () => void;
};

export const SettingsRow = memo(function SettingsRow({
  title,
  iconName,
  subtitle,
  value,
  isDestructive = false,
  showChevron = true,
  showDivider = true,
  onPress,
}: Props) {
  const { colors, effectiveTheme } = useTheme();

  const iconColor = isDestructive ? colors.state.error : colors.brand.primary;
  const textColor = isDestructive ? colors.state.error : colors.text.primary;
  const iconBg = isDestructive
    ? effectiveTheme === 'dark'
      ? 'rgba(186, 26, 26, 0.15)'
      : 'rgba(255, 218, 214, 0.5)'
    : effectiveTheme === 'dark'
      ? 'rgba(216, 228, 242, 0.12)'
      : 'rgba(0, 88, 188, 0.12)';

  return (
    <View>
      <Pressable
        accessibilityHint={subtitle || value || `Navigate to ${title}`}
        accessibilityLabel={title}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.pressed,
          {
            backgroundColor: pressed
              ? effectiveTheme === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.02)'
              : 'transparent',
          },
        ]}>
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <MaterialIcons color={iconColor} name={iconName} size={20} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.text.muted }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightContent}>
          {value && (
            <Text style={[styles.value, { color: colors.text.secondary }]}>
              {value}
            </Text>
          )}
          {showChevron && (
            <MaterialIcons
              color={colors.icon.muted}
              name="chevron-right"
              size={20}
            />
          )}
        </View>
      </Pressable>
      {showDivider && (
        <View
          style={[styles.divider, { backgroundColor: colors.border.subtle }]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  leftContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    marginTop: 2,
  },
  rightContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  value: {
    fontSize: typography.bodySmall,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
  pressed: {
    opacity: 0.8,
  },
});

