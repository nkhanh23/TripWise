import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { buildInitialGenerationReasons, fallbackText } from '../../../integration/explainableItinerary';
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
  onReject?: () => void;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
};

export const CreateTripSuccessView = memo(function CreateTripSuccessView({
  state, preview, onViewItinerary, onExplorePlaces, onSave, onReject, saveStatus = 'idle',
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { locale, t } = useTranslation();
  const destination = preview.destination || state.destination?.name || state.customDestinationName
    || t('planner.explanation.destinationFallback');
  const reasonSet = useMemo(() => buildInitialGenerationReasons({
    tripId: `draft:${preview.startDate}:${preview.endDate}`,
    dayCount: preview.days.length,
    preferenceCount: state.selectedStyles.length,
  }), [preview.days.length, preview.endDate, preview.startDate, state.selectedStyles.length]);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background.canvas }]}
      style={{ backgroundColor: colors.background.canvas }}>
      <View style={[styles.successIconCircle, {
        backgroundColor: effectiveTheme === 'dark' ? 'rgba(0, 88, 188, 0.25)' : 'rgba(0, 88, 188, 0.12)',
      }]}>
        <MaterialIcons color={colors.brand.primary} name="check-circle" size={48} />
      </View>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {t('planner.explanation.readyTitle', { destination })}
      </Text>
      <AppText style={[styles.subtitle, { color: colors.text.secondary }]}>
        {t('planner.explanation.readySubtitle')}
      </AppText>
      <View style={[styles.metaPill, { backgroundColor: colors.background.surfaceVariant }]}>
        <MaterialIcons color={colors.brand.primary} name="event" size={14} />
        <Text style={[styles.metaPillText, { color: colors.text.secondary }]}>
          {t('planner.explanation.dateRange', {
            days: preview.days.length, startDate: preview.startDate, endDate: preview.endDate,
          })}
        </Text>
      </View>

      <View accessible accessibilityLabel={t('planner.explanation.reviewA11y')}
        style={[styles.explanationCard, { backgroundColor: colors.background.surface, borderColor: colors.border.subtle }]}>
        <View style={styles.explanationHeader}>
          <MaterialIcons color={colors.brand.primary} name="fact-check" size={22} />
          <View style={styles.explanationHeaderCopy}>
            <Text style={[styles.explanationTitle, { color: colors.text.primary }]}>{t('planner.explanation.title')}</Text>
            <Text style={[styles.explanationSubtitle, { color: colors.text.secondary }]}>{t('planner.explanation.subtitle')}</Text>
          </View>
        </View>
        {reasonSet.reasons.map((reason) => {
          const explanation = fallbackText(reason, locale);
          const source = t('planner.explanation.sourceUserPreferences');
          return (
            <View accessible accessibilityLabel={`${explanation} ${t('planner.explanation.sourceLabel', { source })}`}
              key={reason.reasonId} style={[styles.reasonRow, { borderTopColor: colors.border.subtle }]}>
              <MaterialIcons color={colors.state.success} name="check-circle-outline" size={20} />
              <View style={styles.reasonCopy}>
                <Text style={[styles.reasonText, { color: colors.text.primary }]}>{explanation}</Text>
                <Text style={[styles.sourceText, { color: colors.text.muted }]}>{t('planner.explanation.sourceLabel', { source })}</Text>
              </View>
            </View>
          );
        })}
        <Text style={[styles.composerText, { color: colors.text.muted }]}>{t('planner.explanation.deterministicWording')}</Text>
      </View>

      <View style={[styles.itineraryCard, { backgroundColor: colors.background.surface, borderColor: colors.border.subtle }]}>
        <Text style={[styles.explanationTitle, { color: colors.text.primary }]}>{t('planner.explanation.itineraryTitle')}</Text>
        {preview.days.map((day) => (
          <View key={day.dayNumber} style={[styles.dayGroup, { borderTopColor: colors.border.subtle }]}>
            <Text style={[styles.dayTitle, { color: colors.brand.primary }]}>
              {t('planner.explanation.dayLabel', { day: day.dayNumber, date: day.date })}
            </Text>
            {day.items.map((item) => (
              <Text key={`${day.dayNumber}:${item.position}`} style={[styles.itemText, { color: colors.text.primary }]}>
                {t('planner.explanation.itemLabel', { position: item.position, placeName: item.placeName })}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.ctaGroup}>
        {onSave && saveStatus !== 'success' ? (
          <Pressable accessibilityLabel={saveStatus === 'saving' ? t('planner.savingTrip') : t('planner.explanation.confirm')}
            accessibilityRole="button" disabled={saveStatus === 'saving'} onPress={onSave}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.brand.primary },
              (pressed || saveStatus === 'saving') && styles.pressed]}>
            <MaterialIcons color={colors.text.inverse} name={saveStatus === 'saving' ? 'hourglass-top' : 'save'} size={20} />
            <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>
              {saveStatus === 'saving' ? t('planner.savingTrip') : t('planner.explanation.confirm')}
            </Text>
          </Pressable>
        ) : null}
        {saveStatus === 'success'
          ? <Text style={[styles.savedText, { color: colors.state.success }]}>{t('planner.tripSaved')}</Text>
          : null}
        <Pressable accessibilityHint={t('planner.explanation.viewHint')} accessibilityLabel={t('planner.explanation.view')}
          accessibilityRole="button" onPress={onViewItinerary}
          style={({ pressed }) => [styles.secondaryButton, {
            backgroundColor: colors.background.surface, borderColor: colors.border.default,
          }, pressed && styles.pressed]}>
          <MaterialIcons color={colors.brand.primary} name="map" size={20} />
          <Text style={[styles.secondaryButtonText, { color: colors.brand.primary }]}>{t('planner.explanation.view')}</Text>
        </Pressable>
        <Pressable accessibilityHint={t('planner.explanation.exploreHint')} accessibilityLabel={t('planner.explanation.explore')}
          accessibilityRole="button" onPress={onExplorePlaces}
          style={({ pressed }) => [styles.secondaryButton, {
            backgroundColor: colors.background.surface, borderColor: colors.border.default,
          }, pressed && styles.pressed]}>
          <MaterialIcons color={colors.brand.primary} name="explore" size={20} />
          <Text style={[styles.secondaryButtonText, { color: colors.brand.primary }]}>{t('planner.explanation.explore')}</Text>
        </Pressable>
        {onReject ? (
          <Pressable accessibilityHint={t('planner.explanation.rejectHint')} accessibilityLabel={t('planner.explanation.reject')}
            accessibilityRole="button" onPress={onReject} style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}>
            <Text style={[styles.rejectButtonText, { color: colors.text.secondary }]}>{t('planner.explanation.reject')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.hintCard, {
        backgroundColor: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(229, 226, 225, 0.4)',
        borderColor: colors.border.subtle,
      }]}>
        <MaterialIcons color={effectiveTheme === 'dark' ? 'rgba(77, 150, 255, 0.3)' : 'rgba(0, 88, 188, 0.3)'}
          name="location-on" size={48} />
        <Text style={[styles.hintCardText, { color: colors.text.muted }]}>
          {t('planner.explanation.preferenceCount', { count: state.selectedStyles.length })}
        </Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', flexGrow: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  successIconCircle: { alignItems: 'center', borderRadius: radius.pill, elevation: 4, height: 80, justifyContent: 'center',
    marginBottom: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, width: 80 },
  title: { fontSize: 24, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: typography.body, lineHeight: 22, marginBottom: spacing.md, maxWidth: 320, textAlign: 'center' },
  metaPill: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: 6, marginBottom: spacing.xl,
    paddingHorizontal: spacing.md, paddingVertical: 6 },
  metaPillText: { fontSize: 12, fontWeight: typography.fontWeight.semibold },
  explanationCard: { borderRadius: radius.card, borderWidth: 1, marginBottom: spacing.xl, padding: spacing.md, width: '100%' },
  explanationHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  explanationHeaderCopy: { flex: 1 },
  explanationTitle: { fontSize: typography.body, fontWeight: typography.fontWeight.bold },
  explanationSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  reasonRow: { borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md },
  reasonCopy: { flex: 1 },
  reasonText: { fontSize: 14, lineHeight: 20 },
  sourceText: { fontSize: 11, marginTop: 4 },
  composerText: { fontSize: 11, marginTop: spacing.md },
  itineraryCard: { borderRadius: radius.card, borderWidth: 1, marginBottom: spacing.xl, padding: spacing.md, width: '100%' },
  dayGroup: { borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.sm },
  dayTitle: { fontSize: 13, fontWeight: typography.fontWeight.bold },
  itemText: { fontSize: 14, lineHeight: 22 },
  ctaGroup: { gap: spacing.md, width: '100%' },
  primaryButton: { alignItems: 'center', borderRadius: radius.pill, elevation: 2, flexDirection: 'row', gap: spacing.sm, height: 48,
    justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, width: '100%' },
  primaryButtonText: { fontSize: typography.body, fontWeight: typography.fontWeight.bold },
  secondaryButton: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm,
    height: 48, justifyContent: 'center', width: '100%' },
  secondaryButtonText: { fontSize: typography.body, fontWeight: typography.fontWeight.bold },
  rejectButton: { alignItems: 'center', height: 44, justifyContent: 'center' },
  rejectButtonText: { fontSize: 14, fontWeight: typography.fontWeight.semibold },
  hintCard: { alignItems: 'center', borderRadius: radius.card, borderWidth: 1, height: 100, justifyContent: 'center',
    marginTop: spacing.xl, overflow: 'hidden', width: '100%' },
  hintCardText: { fontSize: 11, fontWeight: typography.fontWeight.semibold, marginTop: 2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  savedText: { fontSize: typography.body, fontWeight: typography.fontWeight.bold, textAlign: 'center' },
});
