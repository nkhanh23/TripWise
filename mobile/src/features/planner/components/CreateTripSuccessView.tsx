import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import type { CreateTripWizardState } from '../types';

type Props = {
  state: CreateTripWizardState;
  onViewItinerary: () => void;
  onExplorePlaces: () => void;
};

export const CreateTripSuccessView = memo(function CreateTripSuccessView({
  state,
  onViewItinerary,
  onExplorePlaces,
}: Props) {
  const destName = state.destination?.name || state.customDestinationName || 'Bangkok';

  return (
    <View style={styles.container}>
      {/* Celebration Icon Container */}
      <View style={styles.successIconCircle}>
        <MaterialIcons color="#0058BC" name="check-circle" size={48} />
      </View>

      {/* Heading & Subtitle matching Stitch */}
      <Text style={styles.title}>Your {destName} trip is ready</Text>
      <AppText style={styles.subtitle}>
        Start adding places or explore recommendations.
      </AppText>

      {/* Trip Meta Pill */}
      <View style={styles.metaPill}>
        <MaterialIcons color={colors.brand.primary} name="event" size={14} />
        <Text style={styles.metaPillText}>
          {state.durationDays} Days • {state.startDate} – {state.endDate}
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.ctaGroup}>
        <Pressable
          accessibilityHint="Xem lịch trình chi tiết chuyến đi"
          accessibilityLabel="Lập kế hoạch chuyến đi"
          accessibilityRole="button"
          onPress={onViewItinerary}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <MaterialIcons color="#FFFFFF" name="map" size={20} />
          <Text style={styles.primaryButtonText}>Plan my trip</Text>
        </Pressable>

        <Pressable
          accessibilityHint="Khám phá các địa điểm gợi ý cho chuyến đi này"
          accessibilityLabel="Khám phá địa điểm"
          accessibilityRole="button"
          onPress={onExplorePlaces}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <MaterialIcons color={colors.brand.primary} name="explore" size={20} />
          <Text style={styles.secondaryButtonText}>Explore places</Text>
        </Pressable>
      </View>

      {/* Decorative Map Hint Card matching Stitch */}
      <View style={styles.hintCard}>
        <View style={styles.hintCardInner}>
          <MaterialIcons
            color="rgba(0, 88, 188, 0.3)"
            name="location-on"
            size={48}
          />
          <Text style={styles.hintCardText}>
            Personalized for {state.selectedStyles.length} interests
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successIconCircle: {
    alignItems: 'center',
    backgroundColor: '#D8E2FF',
    borderRadius: radius.pill,
    elevation: 4,
    height: 96,
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: 96,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.body,
    lineHeight: 22,
    marginBottom: spacing.md,
    maxWidth: 280,
    textAlign: 'center',
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: '#F0EDED',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  metaPillText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  ctaGroup: {
    gap: spacing.md,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    elevation: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#F6F3F2',
    borderColor: colors.outlineVariant,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 48,
    justifyContent: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: colors.brand.primary,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  hintCard: {
    backgroundColor: 'rgba(229, 226, 225, 0.4)',
    borderColor: 'rgba(193, 198, 215, 0.3)',
    borderRadius: radius.card,
    borderWidth: 1,
    height: 100,
    marginTop: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  hintCardInner: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  hintCardText: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
