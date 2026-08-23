import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { TripDayItinerary } from '../types';
import type { WeatherBadgeData } from '../weather';

type Props = {
  days: TripDayItinerary[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  weather?: WeatherBadgeData | null;
};

export const TripDaySelector = memo(function TripDaySelector({
  days,
  selectedDayId,
  onSelectDay,
  weather,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: colors.text.primary }]}>Itinerary</Text>

        {weather ? (
          <View
            accessibilityLabel={`${weather.conditionDescription}, ${weather.temperatureLabel}`}
            accessibilityRole="summary"
            style={[styles.weatherBadge, { backgroundColor: colors.background.surfaceVariant }]}>
            <MaterialIcons
              color={colors.text.secondary}
              name={weather.iconName}
              size={14}
            />
            <Text style={[styles.weatherText, { color: colors.text.primary }]}>
              {weather.temperatureLabel}
            </Text>
            {weather.precipitationLabel ? (
              <Text style={[styles.precipitationText, { color: colors.brand.primary }]}>
                {weather.precipitationLabel}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

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
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  weatherBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  weatherText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  precipitationText: {
    fontSize: 10,
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
