import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  dayLabel?: string;
  onExplore?: () => void;
};

export const TripEmptyDayState = memo(function TripEmptyDayState({
  dayLabel,
  onExplore,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: effectiveTheme === 'dark' ? '#1E3A5F' : '#D8E2FF' },
        ]}>
        <MaterialIcons color={colors.brand.primary} name="event-busy" size={32} />
      </View>

      <Text style={[styles.title, { color: colors.text.primary }]}>
        {t('tripDetail.emptyDayTitle')}
      </Text>
      <AppText style={styles.subtitle}>
        {dayLabel
          ? `There are no scheduled activities for ${dayLabel} yet.`
          : t('tripDetail.emptyDaySubtitle')}
      </AppText>

      {onExplore ? (
        <Pressable
          accessibilityHint="Khám phá địa điểm cho ngày này"
          accessibilityLabel="Khám phá địa điểm"
          accessibilityRole="button"
          onPress={onExplore}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.brand.primary },
            pressed && styles.pressed,
          ]}>
          <MaterialIcons color={colors.text.inverse} name="explore" size={18} />
          <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
            {t('tripDetail.explorePlaces')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 64,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    lineHeight: 18,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 2,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
