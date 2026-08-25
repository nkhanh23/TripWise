import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";

type Props = {
  isFiltered?: boolean;
  onExplore: () => void;
  onShowAll?: () => void;
};

export const SavedEmptyState = memo(function SavedEmptyState({
  isFiltered = false,
  onExplore,
  onShowAll,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const title = isFiltered
    ? t("savedPlaces.emptyCategoryTitle")
    : t("savedPlaces.emptyTitle");
  const subtitle = isFiltered
    ? t("savedPlaces.emptyCategorySubtitle")
    : t("savedPlaces.emptySubtitle");

  return (
    <View accessibilityRole="text" accessible style={styles.container}>
      {/* 1. Illustration Container */}
      <View style={styles.illustrationContainer}>
        {/* Outer ambient circle */}
        <View
          style={[
            styles.outerCircle,
            {
              backgroundColor:
                effectiveTheme === "dark"
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(0, 88, 188, 0.05)",
            },
          ]}
        />
        {/* Inner circle */}
        <View
          style={[
            styles.innerCircle,
            {
              backgroundColor:
                effectiveTheme === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 88, 188, 0.09)",
            },
          ]}
        />
        {/* Main Bookmark icon */}
        <MaterialIcons
          color={
            effectiveTheme === "dark"
              ? "rgba(255, 255, 255, 0.25)"
              : "rgba(0, 88, 188, 0.25)"
          }
          name="bookmark"
          size={84}
        />
        {/* Location Badge overlay */}
        <View
          style={[
            styles.badgeOverlay,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          <MaterialIcons
            color={colors.brand.primary}
            name="location-on"
            size={26}
          />
        </View>
      </View>

      {/* 2. Text Content */}
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        {subtitle}
      </Text>

      {/* 3. Primary CTA Button */}
      {isFiltered && onShowAll ? (
        <Pressable
          accessibilityHint={t("savedPlaces.showAllCTA")}
          accessibilityLabel={t("savedPlaces.showAllCTA")}
          accessibilityRole="button"
          onPress={onShowAll}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: colors.brand.primary },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            color={colors.text.inverse}
            name="filter-list"
            size={20}
          />
          <Text style={[styles.ctaText, { color: colors.text.inverse }]}>
            {t("savedPlaces.showAllCTA")}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityHint={t("savedPlaces.exploreCTA")}
          accessibilityLabel={t("savedPlaces.exploreCTA")}
          accessibilityRole="button"
          onPress={onExplore}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: colors.brand.primary },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons color={colors.text.inverse} name="explore" size={20} />
          <Text style={[styles.ctaText, { color: colors.text.inverse }]}>
            {t("savedPlaces.exploreCTA")}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  illustrationContainer: {
    alignItems: "center",
    height: 180,
    justifyContent: "center",
    marginBottom: spacing.xl,
    position: "relative",
    width: 180,
  },
  outerCircle: {
    borderRadius: 90,
    height: 180,
    position: "absolute",
    width: 180,
  },
  innerCircle: {
    borderRadius: 70,
    height: 140,
    position: "absolute",
    width: 140,
  },
  badgeOverlay: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 20,
    elevation: 3,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: 44,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.body,
    lineHeight: 20,
    marginBottom: spacing.xl,
    maxWidth: 280,
    textAlign: "center",
  },
  ctaButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    elevation: 2,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: "100%",
  },
  ctaText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
