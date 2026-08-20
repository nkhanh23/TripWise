import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { TripDayItinerary } from '../types';

type Props = {
  days: TripDayItinerary[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
};

export const TripDaySelector = memo(function TripDaySelector({
  days,
  selectedDayId,
  onSelectDay,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.surface }]}>
      <Text style={[styles.heading, { color: colors.text.primary }]}>Itinerary</Text>

      {/* Horizontal Day Chips List */}
      <FlatList
        contentContainerStyle={styles.chipsContent}
        data={days}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedDayId;

          return (
            <Pressable
              accessibilityHint={`Select ${item.dateLabel || `Day ${item.dayNumber}`}`}
              accessibilityLabel={item.dateLabel || `Day ${item.dayNumber}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectDay(item.id)}
              style={({ pressed }) => [
                styles.chip,
                isSelected
                  ? [styles.chipSelected, { backgroundColor: colors.brand.primary }]
                  : [
                      styles.chipUnselected,
                      {
                        backgroundColor: colors.background.surface,
                        borderColor: colors.border.default,
                      },
                    ],
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.chipText,
                  isSelected
                    ? [styles.chipTextSelected, { color: colors.text.inverse }]
                    : [styles.chipTextUnselected, { color: colors.text.secondary }],
                ]}>
                {item.dateLabel || `Day ${item.dayNumber}`}
              </Text>
            </Pressable>
          );
        }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  heading: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  chipsContent: {
    gap: spacing.xs,
    paddingBottom: 4,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipSelected: {},
  chipUnselected: {
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  chipTextSelected: {},
  chipTextUnselected: {},
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
