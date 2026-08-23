import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  onNavigatePlan: () => void;
  onNavigateExplore: () => void;
  onNavigateTrips: () => void;
  onNavigateSaved: () => void;
};

export const HomeQuickActions = memo(function HomeQuickActions({
  onNavigatePlan,
  onNavigateExplore,
  onNavigateTrips,
  onNavigateSaved,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const actions = [
    {
      key: 'plan',
      label: t('home.actions.plan'),
      icon: 'edit-calendar' as const,
      isPrimary: true,
      onPress: onNavigatePlan,
    },
    {
      key: 'explore',
      label: t('home.actions.explore'),
      icon: 'explore' as const,
      isPrimary: false,
      onPress: onNavigateExplore,
    },
    {
      key: 'trips',
      label: t('home.actions.trips'),
      icon: 'flight' as const,
      isPrimary: false,
      onPress: onNavigateTrips,
    },
    {
      key: 'saved',
      label: t('home.actions.saved'),
      icon: 'bookmark' as const,
      isPrimary: false,
      onPress: onNavigateSaved,
    },
  ];

  return (
    <View style={styles.grid}>
      {actions.map((act) => (
        <Pressable
          accessibilityHint={act.label}
          accessibilityLabel={act.label}
          accessibilityRole="button"
          key={act.key}
          onPress={act.onPress}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
            pressed && styles.cardPressed,
          ]}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: act.isPrimary
                  ? effectiveTheme === 'dark'
                    ? '#1E354D'
                    : '#D8E2FF'
                  : colors.background.surfaceVariant,
              },
            ]}>
            <MaterialIcons
              color={act.isPrimary ? colors.brand.primary : colors.text.secondary}
              name={act.icon}
              size={22}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: colors.text.primary }]}>
            {act.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  card: {
    alignItems: 'center',
    borderRadius: radius.control, // 16px matching Stitch rounded-xl
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  label: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
});
