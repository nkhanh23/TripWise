import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { MaterialIconName } from '../types';

type Props = {
  title: string;
  iconName: MaterialIconName;
  description?: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  showDivider?: boolean;
};

export const SettingsSwitchRow = memo(function SettingsSwitchRow({
  title,
  iconName,
  description,
  value,
  onValueChange,
  showDivider = true,
}: Props) {
  const { colors, effectiveTheme } = useTheme();

  const iconBg =
    effectiveTheme === 'dark'
      ? 'rgba(216, 228, 242, 0.12)'
      : 'rgba(0, 88, 188, 0.12)';

  return (
    <View>
      <View
        accessibilityHint={description}
        accessibilityLabel={title}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        style={styles.row}>
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <MaterialIcons
              color={colors.brand.primary}
              name={iconName}
              size={20}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {title}
            </Text>
            {description && (
              <Text style={[styles.description, { color: colors.text.muted }]}>
                {description}
              </Text>
            )}
          </View>
        </View>

        <Switch
          ios_backgroundColor={colors.border.default}
          onValueChange={onValueChange}
          thumbColor={
            value
              ? colors.background.surface
              : effectiveTheme === 'dark'
                ? colors.text.muted
                : '#f4f3f4'
          }
          trackColor={{
            false: colors.border.default,
            true: colors.brand.primary,
          }}
          value={value}
        />
      </View>
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
    marginRight: spacing.md,
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
  description: {
    fontSize: typography.bodySmall,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
});

