import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../components/AppText";
import type { ExplorePlace } from "../../explore/types";
import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";

type Props = {
  place: ExplorePlace;
  onSelect: (place: ExplorePlace) => void;
  isSelected?: boolean;
};

export function AddPlaceResultCard({
  place,
  onSelect,
  isSelected = false,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityHint={t("addPlace.selectPlace")}
      accessibilityLabel={`${place.name}, ${place.categoryLabel ?? ""}, ${place.address}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(place)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: isSelected
            ? colors.brand.primary
            : colors.border.default,
          borderWidth: isSelected ? 2 : 1,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {/* 1. Place Image Thumbnail */}
      <View
        style={[
          styles.imageContainer,
          { backgroundColor: colors.background.surfaceVariant },
        ]}
      >
        {place.imageUrl ? (
          <Image
            resizeMode="cover"
            source={{ uri: place.imageUrl }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialIcons
              color={colors.icon.secondary}
              name={
                (place.iconName as keyof typeof MaterialIcons.glyphMap) ||
                "place"
              }
              size={28}
            />
          </View>
        )}
      </View>

      {/* 2. Place Details */}
      <View style={styles.detailsContainer}>
        {/* Top row: Category & Rating */}
        <View style={styles.topRow}>
          <AppText
            style={[styles.categoryLabel, { color: colors.text.secondary }]}
          >
            {place.categoryLabel || place.category}
          </AppText>
          <View
            style={[
              styles.ratingBadge,
              {
                backgroundColor: colors.background.surfaceVariant,
                borderColor: colors.border.subtle,
              },
            ]}
          >
            <MaterialIcons color={colors.brand.primary} name="star" size={13} />
            <AppText
              style={[styles.ratingText, { color: colors.text.primary }]}
            >
              {place.rating.toFixed(1)}
            </AppText>
          </View>
        </View>

        {/* Place Name */}
        <AppText
          numberOfLines={1}
          style={[styles.title, { color: colors.text.primary }]}
        >
          {place.name}
        </AppText>

        {/* Place Location */}
        <View style={styles.locationRow}>
          <MaterialIcons
            color={colors.icon.secondary}
            name="location-on"
            size={14}
          />
          <AppText
            numberOfLines={1}
            style={[styles.locationText, { color: colors.text.secondary }]}
          >
            {place.address}
          </AppText>
        </View>
      </View>

      {/* 3. Action button / indicator */}
      <View
        style={[
          styles.actionButton,
          {
            backgroundColor: isSelected
              ? colors.brand.primary
              : colors.background.surfaceVariant,
          },
        ]}
      >
        <MaterialIcons
          color={isSelected ? colors.text.inverse : colors.brand.primary}
          name={isSelected ? "check" : "add"}
          size={20}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: radius.control,
    flexDirection: "row",
    marginBottom: spacing.md,
    padding: spacing.md,
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    borderRadius: radius.input,
    height: 72,
    overflow: "hidden",
    width: 72,
  },
  image: {
    height: "100%",
    width: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  detailsContainer: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
    marginHorizontal: spacing.md,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    textTransform: "uppercase",
  },
  ratingBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  locationText: {
    flex: 1,
    fontSize: typography.bodySmall,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
