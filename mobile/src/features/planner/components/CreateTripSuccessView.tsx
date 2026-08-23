import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { PlannerGeneratedPreview } from '../generation';
import type { CreateTripWizardState } from '../types';

type Props = {
  state: CreateTripWizardState;
  preview: PlannerGeneratedPreview;
  onViewItinerary: () => void;
  onExplorePlaces: () => void;
  onSave?: () => void;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
};

export const CreateTripSuccessView = memo(function CreateTripSuccessView({
  state,
  preview,
  onViewItinerary,
  onExplorePlaces,
  onSave,
  saveStatus = 'idle',
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const destName = preview.destination || state.destination?.name || state.customDestinationName || 'Bangkok';

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
      {/* Celebration Icon Container */}
      <View
        style={[
          styles.successIconCircle,
          {
            backgroundColor:
              effectiveTheme === 'dark'
                ? 'rgba(0, 88, 188, 0.25)'
                : 'rgba(0, 88, 188, 0.12)',
          },
        ]}>
        <MaterialIcons color={colors.brand.primary} name="check-circle" size={48} />
      </View>

      {/* Heading & Subtitle matching Stitch */}
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Your {destName} trip is ready
      </Text>
      <AppText style={[styles.subtitle, { color: colors.text.secondary }]}>
        Start adding places or explore recommendations.
      </AppText>

      {/* Trip Meta Pill */}
      <View
        style={[
          styles.metaPill,
          { backgroundColor: colors.background.surfaceVariant },
        ]}>
        <MaterialIcons color={colors.brand.primary} name="event" size={14} />
        <Text style={[styles.metaPillText, { color: colors.text.secondary }]}>
          {preview.days.length} Days • {preview.startDate} – {preview.endDate}
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.ctaGroup}>
        {onSave && saveStatus !== 'success' ? (
          <Pressable
            accessibilityLabel={saveStatus === 'saving' ? t('planner.savingTrip') : t('planner.saveTrip')}
            accessibilityRole="button"
            disabled={saveStatus === 'saving'}
            onPress={onSave}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.brand.primary },
              (pressed || saveStatus === 'saving') && styles.pressed,
            ]}>
            <MaterialIcons color={colors.text.inverse} name={saveStatus === 'saving' ? 'hourglass-top' : 'save'} size={20} />
            <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>
              {saveStatus === 'saving' ? t('planner.savingTrip') : t('planner.saveTrip')}
            </Text>
          </Pressable>
        ) : null}
        {saveStatus === 'success' ? (
          <Text style={[styles.savedText, { color: colors.state.success }]}>
            {t('planner.tripSaved')}
          </Text>
        ) : null}
        <Pressable
          accessibilityHint="Xem lịch trình chi tiết chuyến đi"
          accessibilityLabel="Lập kế hoạch chuyến đi"
          accessibilityRole="button"
          onPress={onViewItinerary}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.brand.primary },
            pressed && styles.pressed,
          ]}>
          <MaterialIcons color={colors.text.inverse} name="map" size={20} />
          <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>
            Plan my trip
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint="Khám phá các địa điểm gợi ý cho chuyến đi này"
          accessibilityLabel="Khám phá địa điểm"
          accessibilityRole="button"
          onPress={onExplorePlaces}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
            pressed && styles.pressed,
          ]}>
          <MaterialIcons color={colors.brand.primary} name="explore" size={20} />
          <Text style={[styles.secondaryButtonText, { color: colors.brand.primary }]}>
            Explore places
          </Text>
        </Pressable>
      </View>

      {/* Decorative Map Hint Card matching Stitch */}
      <View
        style={[
          styles.hintCard,
          {
            backgroundColor:
              effectiveTheme === 'dark'
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(229, 226, 225, 0.4)',
            borderColor: colors.border.subtle,
          },
        ]}>
        <View style={styles.hintCardInner}>
          <MaterialIcons
            color={
              effectiveTheme === 'dark'
                ? 'rgba(77, 150, 255, 0.3)'
                : 'rgba(0, 88, 188, 0.3)'
            }
            name="location-on"
            size={48}
          />
          <Text style={[styles.hintCardText, { color: colors.text.muted }]}>
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
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body,
    lineHeight: 22,
    marginBottom: spacing.md,
    maxWidth: 280,
    textAlign: 'center',
  },
  metaPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  ctaGroup: {
    gap: spacing.md,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
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
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 48,
    justifyContent: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  hintCard: {
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
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  savedText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
});
