import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import type { EventCandidate } from '../../../integration/eventIntelligenceContract';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  event: EventCandidate;
  isFallback?: boolean;
  onPress?: (event: EventCandidate) => void;
};

export const EventCandidateCard = memo(function EventCandidateCard({
  event,
  isFallback = false,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const venue = event.venues?.[0];
  const hasCoordinates = venue?.location !== undefined;

  // Formatted date and time without inventing durations or offsets
  const formattedTime = useMemo(() => {
    const start = event.start;
    if (start.dateTBD) {
      return t('intelligence.events.dateTBD');
    }
    if (start.kind === 'UTC') {
      try {
        const d = new Date(start.dateTime);
        const dateStr = d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const timeStr = start.timeTBA
          ? t('intelligence.events.timeTBA')
          : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} • ${timeStr}`;
      } catch {
        return start.dateTime;
      }
    } else {
      // PROVIDER_LOCAL
      const timeStr = start.timeTBA
        ? t('intelligence.events.timeTBA')
        : start.localTime ?? '';
      const localLabel = t('intelligence.events.localTime');
      const timePart = timeStr ? ` • ${timeStr}` : '';
      return `${start.localDate}${timePart} ${localLabel}`;
    }
  }, [event.start, t]);

  return (
    <Pressable
      accessibilityHint={t('intelligence.events.viewDetails')}
      accessibilityLabel={`${event.title}, ${formattedTime}, ${venue?.name ?? ''}`}
      accessibilityRole="button"
      onPress={() => onPress?.(event)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
        pressed && styles.cardPressed,
      ]}>
      {/* Top Header: Category & Badges */}
      <View style={styles.topRow}>
        <View style={styles.badgesWrap}>
          {/* Review Required Badge */}
          <View
            accessibilityLabel={t('intelligence.reviewRequired')}
            accessibilityRole="text"
            style={[styles.reviewBadge, { backgroundColor: '#FFF3CD', borderColor: '#FFEEBA' }]}>
            <MaterialIcons color="#856404" name="rate-review" size={12} />
            <Text style={[styles.reviewBadgeText, { color: '#856404' }]}>
              {t('intelligence.reviewRequired')}
            </Text>
          </View>

          {/* Stale / Fallback Badge */}
          {isFallback ? (
            <View
              accessibilityLabel={t('intelligence.stale')}
              accessibilityRole="text"
              style={[styles.fallbackBadge, { backgroundColor: colors.background.surfaceVariant }]}>
              <MaterialIcons color={colors.text.muted} name="cached" size={12} />
              <Text style={[styles.fallbackBadgeText, { color: colors.text.muted }]}>
                {t('intelligence.stale')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Ticketmaster Official Attribution Badge */}
        <View
          accessibilityLabel={t('intelligence.events.attribution')}
          accessibilityRole="text"
          style={[styles.tmBadge, { backgroundColor: '#024DDF' }]}>
          <Text style={styles.tmBadgeText}>Ticketmaster</Text>
        </View>
      </View>

      {/* Event Title */}
      <Text numberOfLines={2} style={[styles.title, { color: colors.text.primary }]}>
        {event.title}
      </Text>

      {/* Timing Info */}
      <View style={styles.infoRow}>
        <MaterialIcons color={colors.brand.primary} name="event" size={15} />
        <Text numberOfLines={1} style={[styles.infoText, { color: colors.text.secondary }]}>
          {formattedTime}
        </Text>
      </View>

      {/* Venue & Location Info */}
      <View style={styles.infoRow}>
        <MaterialIcons
          color={hasCoordinates ? colors.state.error : colors.text.muted}
          name="place"
          size={15}
        />
        <Text numberOfLines={1} style={[styles.infoText, { color: colors.text.secondary }]}>
          {venue?.name ?? t('intelligence.events.venueUnavailable')}
          {!hasCoordinates && venue?.name ? ` (${t('intelligence.events.venueUnavailable')})` : ''}
        </Text>
      </View>

      {/* Source disclosure */}
      <View style={styles.footerRow}>
        <Text style={[styles.sourceText, { color: colors.text.muted }]}>
          {t('intelligence.events.attribution')}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  badgesWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  reviewBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  fallbackBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fallbackBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
  },
  tmBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tmBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 20,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  infoText: {
    flex: 1,
    fontSize: typography.bodySmall,
  },
  footerRow: {
    borderTopColor: '#EEEEEE',
    borderTopWidth: 0.5,
    marginTop: 4,
    paddingTop: 4,
  },
  sourceText: {
    fontSize: 10,
  },
});
