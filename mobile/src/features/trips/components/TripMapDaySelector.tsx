import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { TripDayItinerary } from '../types';

type Props = {
  days: TripDayItinerary[];
  selectedDayId: string | 'all';
  onSelectDay: (dayId: string | 'all') => void;
};

type DayFilterOption = {
  id: string | 'all';
  label: string;
};

export const TripMapDaySelector = memo(function TripMapDaySelector({
  days,
  selectedDayId,
  onSelectDay,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const options: DayFilterOption[] = [
    { id: 'all', label: t('tripMap.allDays') },
    ...days.map((day) => ({
      id: day.id,
      label: t('tripMap.dayNumber', { number: day.dayNumber }),
    })),
  ];

  const renderItem = ({ item }: { item: DayFilterOption }) => {
    const isSelected = item.id === selectedDayId;

    return (
      <Pressable
        accessibilityHint={`Filter map by ${item.label}`}
        accessibilityLabel={item.label}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => onSelectDay(item.id)}
        style={({ pressed }) => [
          styles.chip,
          isSelected
            ? [styles.selectedChip, { backgroundColor: colors.brand.primary }]
            : [
                styles.unselectedChip,
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
              ? [styles.selectedText, { color: colors.text.inverse }]
              : [styles.unselectedText, { color: colors.text.primary }],
          ]}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={options}
        horizontal
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    width: '100%',
    zIndex: 20,
  },
  listContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  selectedChip: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  unselectedChip: {
    borderWidth: 1,
  },
  chipText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  selectedText: {},
  unselectedText: {},
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
