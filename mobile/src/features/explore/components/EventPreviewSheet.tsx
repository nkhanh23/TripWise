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
  onClose: () => void;
};

export const EventPreviewSheet = memo(function EventPreviewSheet({
  event,
  isFallback = false,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const venue = event.venues?.[0];
  const hasCoordinates = venue?.location !== undefined;

  const formattedTime = useMemo(() => {
    const start = event.start;
    if (start.dateTBD) {
      return t('intelligence.events.dateTBD');
    }
    if (start.kind === 'UTC') {
      try {
        const d = new Date(start.dateTime);
        const dateStr = d.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
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
      const timeStr = start.timeTBA
        ? t('intelligence.events.timeTBA')
        : start.localTime ?? '';
      const localLabel = t('intelligence.events.localTime');
      const timePart = timeStr ? ` • ${timeStr}` : '';
      return `${start.localDate}${timePart} ${localLabel}`;
    }
  }, [event.start, t]);

  return (
    <View
      style={[
        styles.sheetContainer,
        {
          backgroundColor: colors.background.surface,
          borderTopColor: colors.border.default,
        },
      ]}>
      {/* Grabber handle */}
      <View style={[styles.grabber, { backgroundColor: colors.border.default }]} />

      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerBadges}>
          {/* Review Required Badge */}
          <View
            accessibilityLabel={t('intelligence.reviewRequired')}
            accessibilityRole="text"
            style={[styles.reviewBadge, { backgroundColor: '#FFF3CD', borderColor: '#FFEEBA' }]}>
            <MaterialIcons color="#856404" name="rate-review" size={13} />
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

          {/* Ticketmaster Official Attribution */}
          <View
            accessibilityLabel={t('intelligence.events.attribution')}
            accessibilityRole="text"
            style={[styles.tmBadge, { backgroundColor: '#024DDF' }]}>
            <Text style={styles.tmBadgeText}>Ticketmaster</Text>
          </View>
        </View>

        {/* Close Button */}
        <Pressable
          accessibilityHint="Đóng khung xem trước sự kiện"
          accessibilityLabel="Đóng"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: colors.background.surfaceVariant },
            pressed && styles.closeButtonPressed,
          ]}>
          <MaterialIcons color={colors.text.primary} name="close" size={18} />
        </Pressable>
      </View>

      {/* Event Title */}
      <Text numberOfLines={3} style={[styles.title, { color: colors.text.primary }]}>
        {event.title}
      </Text>

      {/* Detail Facts Card */}
      <View
        style={[
          styles.factsCard,
          { backgroundColor: colors.background.surfaceVariant },
        ]}>
        {/* Date & Time */}
        <View style={styles.factRow}>
          <MaterialIcons color={colors.brand.primary} name="event" size={18} />
          <View style={styles.factContent}>
            <Text style={[styles.factLabel, { color: colors.text.muted }]}>
              {t('place.openingHours')}
            </Text>
            <Text style={[styles.factValue, { color: colors.text.primary }]}>
              {formattedTime}
            </Text>
          </View>
        </View>

        {/* Venue & Location */}
        <View style={styles.factRow}>
          <MaterialIcons
            color={hasCoordinates ? colors.state.error : colors.text.muted}
            name="place"
            size={18}
          />
          <View style={styles.factContent}>
            <Text style={[styles.factLabel, { color: colors.text.muted }]}>
              {t('place.address')}
            </Text>
            <Text style={[styles.factValue, { color: colors.text.primary }]}>
              {venue?.name ?? t('intelligence.events.venueUnavailable')}
            </Text>
            {!hasCoordinates ? (
              <Text style={[styles.factNote, { color: colors.text.muted }]}>
                {t('intelligence.events.venueUnavailable')}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Ephemeral Review Notice (Zero silent persistence) */}
      <View
        accessibilityLabel={t('intelligence.reviewDescription')}
        accessibilityRole="text"
        style={[styles.noticeBox, { backgroundColor: colors.background.surfaceVariant }]}>
        <MaterialIcons color={colors.brand.primary} name="info-outline" size={16} />
        <Text style={[styles.noticeText, { color: colors.text.secondary }]}>
          {t('intelligence.reviewDescription')}
        </Text>
      </View>

      {/* Attribution Footer */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.text.muted }]}>
          {t('intelligence.events.attribution')}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    bottom: 0,
    elevation: 10,
    gap: spacing.sm,
    left: 0,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    zIndex: 40,
  },
  grabber: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.xs,
    width: 40,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerBadges: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 22,
  },
  factsCard: {
    borderRadius: radius.card,
    gap: spacing.sm,
    padding: spacing.md,
  },
  factRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  factContent: {
    flex: 1,
    gap: 2,
  },
  factLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  factValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  factNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  noticeBox: {
    alignItems: 'center',
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 2,
  },
  footerText: {
    fontSize: 10,
  },
});
