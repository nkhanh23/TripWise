import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { TripSummary } from '../types';

type Props = {
  trip: TripSummary;
  onPress: (tripId: string) => void;
};

export const PastTripCard = memo(function PastTripCard({ trip, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityHint="Xem lại hình ảnh và thông tin chuyến đi đã qua"
      accessibilityLabel={`${trip.title}, ${trip.dateLabel}`}
      accessibilityRole="button"
      onPress={() => onPress(trip.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.surfaceVariant,
          borderColor: colors.border.default,
        },
        pressed && styles.pressed,
      ]}>
      {/* Title */}
      <Text
        numberOfLines={1}
        style={[styles.titleText, { color: colors.text.primary }]}>
        {trip.title}
      </Text>

      {/* Date metadata */}
      <View style={styles.dateRow}>
        <MaterialIcons color={colors.text.secondary} name="event-available" size={14} />
        <Text style={[styles.dateText, { color: colors.text.secondary }]}>
          {trip.dateLabel}
        </Text>
      </View>

      {/* Footer link */}
      <View
        style={[
          styles.footerRow,
          { borderTopColor: colors.border.subtle },
        ]}>
        <Text style={[styles.actionText, { color: colors.text.secondary }]}>
          {trip.actionLabel ?? 'Review Photos'}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.input, // 8px matching Stitch rounded-lg
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  titleText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: typography.bodySmall,
  },
  footerRow: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  actionText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
