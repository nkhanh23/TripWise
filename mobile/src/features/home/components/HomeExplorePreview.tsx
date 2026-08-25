import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { InspirationItem } from "../types";

type Props = {
  inspiration: InspirationItem;
  onPressExplore: () => void;
};

export const HomeExplorePreview = memo(function HomeExplorePreview({
  inspiration,
  onPressExplore,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityHint={t("home.exploreMap")}
      accessibilityLabel={`${inspiration.title}, ${t("home.exploreMap")}`}
      accessibilityRole="button"
      onPress={onPressExplore}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Background Image */}
      {inspiration.imageUrl ? (
        <Image
          accessibilityRole="image"
          resizeMode="cover"
          source={{ uri: inspiration.imageUrl }}
          style={styles.image}
        />
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            { backgroundColor: colors.background.surfaceVariant },
          ]}
        >
          <MaterialIcons color={colors.brand.primary} name="map" size={40} />
        </View>
      )}

      {/* Dark Gradient / Scrim Overlay */}
      <View style={styles.overlay} />

      {/* Bottom Content Row */}
      <View style={styles.contentRow}>
        <View style={styles.textColumn}>
          <Text numberOfLines={1} style={styles.title}>
            {inspiration.title}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {inspiration.locationName}
          </Text>
        </View>

        <View
          style={[
            styles.circleButton,
            { backgroundColor: colors.brand.primary },
          ]}
        >
          <MaterialIcons
            color={colors.text.inverse}
            name="arrow-forward"
            size={18}
          />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.control, // 16px matching Stitch rounded-xl
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    minHeight: 140,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  image: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    position: "absolute",
    width: "100%",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  contentRow: {
    alignItems: "flex-end",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  textColumn: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    color: "#FFFFFF",
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  circleButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});
