import { memo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { CategoryOption, ExploreCategory } from "../../explore/types";

export const SAVED_CATEGORIES: CategoryOption[] = [
  { id: "all", label: "All", iconName: "star" },
  { id: "attractions", label: "Attractions", iconName: "attractions" },
  { id: "restaurants", label: "Food", iconName: "restaurant" },
  { id: "coffee", label: "Cafés", iconName: "local-cafe" },
  { id: "shopping", label: "Shopping", iconName: "shopping-bag" },
  { id: "hotels", label: "Hotels", iconName: "hotel" },
];

type Props = {
  selectedCategory: ExploreCategory;
  onSelectCategory: (category: ExploreCategory) => void;
};

export const SavedCategoryChips = memo(function SavedCategoryChips({
  selectedCategory,
  onSelectCategory,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const getCategoryLabel = (catId: ExploreCategory) => {
    switch (catId) {
      case "all":
        return t("savedPlaces.categories.all");
      case "attractions":
        return t("savedPlaces.categories.attractions");
      case "restaurants":
        return t("savedPlaces.categories.food");
      case "coffee":
        return t("savedPlaces.categories.cafes");
      case "shopping":
        return t("savedPlaces.categories.shopping");
      case "hotels":
        return t("savedPlaces.categories.hotels");
      default:
        return catId;
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={SAVED_CATEGORIES}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item.id;
          const label = getCategoryLabel(item.id);

          return (
            <Pressable
              accessibilityHint={`Filter saved places by ${label}`}
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectCategory(item.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.brand.primary
                    : colors.background.surface,
                  borderColor: isSelected
                    ? colors.brand.primary
                    : colors.border.default,
                },
                isSelected && styles.selectedChipShadow,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected
                      ? colors.text.inverse
                      : colors.text.primary,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  listContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  selectedChipShadow: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  chipText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
