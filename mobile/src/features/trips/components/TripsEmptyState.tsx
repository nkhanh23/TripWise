import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  onCreateTrip: () => void;
};

export const TripsEmptyState = memo(function TripsEmptyState({ onCreateTrip }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View accessibilityRole="summary" style={styles.container}>
      {/* Illustration Layer */}
      <View style={styles.illustrationWrap}>
        <View
          style={[
            styles.outerCircle,
            { backgroundColor: colors.background.surfaceVariant },
          ]}
        />
        <View
          style={[
            styles.innerCircle,
            { backgroundColor: colors.background.surfaceVariant },
          ]}
        >
          <MaterialIcons color={colors.text.muted} name="flight-takeoff" size={56} />
        </View>
        <View
          style={[
            styles.badgeLocation,
            { backgroundColor: colors.background.surface },
          ]}
        >
          <MaterialIcons color={colors.brand.primary} name="location-on" size={20} />
        </View>
      </View>

      {/* Heading & Subtitle */}
      <Text style={[styles.titleText, { color: colors.text.primary }]}>
        {t('trips.emptyTitle')}
      </Text>
      <AppText style={styles.subtitleText}>
        {t('trips.emptySubtitle')}
      </AppText>

      {/* Primary CTA */}
      <Pressable
        accessibilityHint="Tạo chuyến đi đầu tiên để bắt đầu kế hoạch"
        accessibilityLabel="Tạo chuyến đi đầu tiên"
        accessibilityRole="button"
        onPress={onCreateTrip}
        style={({ pressed }) => [
          styles.ctaButton,
          { backgroundColor: colors.brand.primary },
          pressed && styles.ctaPressed,
        ]}>
        <MaterialIcons color={colors.text.inverse} name="add" size={18} />
        <Text style={[styles.ctaText, { color: colors.text.inverse }]}>
          {t('trips.createFirstTrip')}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  illustrationWrap: {
    alignItems: 'center',
    height: 140,
    justifyContent: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
    width: 140,
  },
  outerCircle: {
    borderRadius: radius.pill,
    height: 130,
    opacity: 0.8,
    position: 'absolute',
    width: 130,
  },
  innerCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 100,
    justifyContent: 'center',
    width: 100,
  },
  badgeLocation: {
    alignItems: 'center',
    borderRadius: radius.pill,
    bottom: 8,
    elevation: 3,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: 36,
  },
  titleText: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xl,
    maxWidth: 280,
    textAlign: 'center',
  },
  ctaButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 2,
    flexDirection: 'row',
    gap: 6,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
});
