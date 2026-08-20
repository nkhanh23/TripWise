import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { exploreCategories } from '../data/mockPlaces';
import type { CategoryOption, ExploreCategory } from '../types';

type Props = {
  selectedCategory: ExploreCategory;
  onSelectCategory: (category: ExploreCategory) => void;
};

export const ExploreCategoryChips = memo(function ExploreCategoryChips({
  selectedCategory,
  onSelectCategory,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const renderItem = ({ item }: { item: CategoryOption }) => {
    const isSelected = item.id === selectedCategory;
    const localizedLabel = t(`explore.categories.${item.id}`) !== `explore.categories.${item.id}`
      ? t(`explore.categories.${item.id}`)
      : item.label;

    return (
      <Pressable
        accessibilityHint={`Filter by ${localizedLabel}`}
        accessibilityLabel={localizedLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => onSelectCategory(item.id)}
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
          pressed && styles.chipPressed,
        ]}>
        <MaterialIcons
          color={isSelected ? colors.text.inverse : colors.text.secondary}
          name={item.iconName}
          size={16}
        />
        <Text
          style={[
            styles.chipLabel,
            isSelected
              ? [styles.selectedLabel, { color: colors.text.inverse }]
              : [styles.unselectedLabel, { color: colors.text.primary }],
          ]}>
          {localizedLabel}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={exploreCategories}
        horizontal
        keyExtractor={(item) => item.id}
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
    flexDirection: 'row',
    gap: 6,
    height: 38,
    paddingHorizontal: spacing.md,
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
  chipLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  selectedLabel: {},
  unselectedLabel: {},
  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
