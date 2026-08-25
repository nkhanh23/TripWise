import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { ResolvedImage } from "../../../integration/contracts";
import { ImageAttribution } from "../../images/components/ImageAttribution";
import { getResolvedImageSource } from "../../images/resolvedImageSource";

type Props = {
  destination: string;
  dateLabel: string;
  heroImageUrl?: string;
  topInset?: number;
  resolvedImage?: ResolvedImage;
};

export const TripDetailHero = memo(function TripDetailHero({
  destination,
  dateLabel,
  heroImageUrl,
  topInset = 0,
  resolvedImage,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const validHeroImageUrl =
    heroImageUrl &&
    (heroImageUrl.startsWith("http://") || heroImageUrl.startsWith("https://"))
      ? heroImageUrl
      : undefined;
  const hasValidPhoto = Boolean(validHeroImageUrl);

  const heroHeight = Math.max(270, 210 + topInset);

  return (
    <View
      style={[
        styles.container,
        {
          height: heroHeight,
          backgroundColor: hasValidPhoto
            ? colors.background.surfaceVariant
            : effectiveTheme === "dark"
              ? "#0E2A4A"
              : colors.brand.primary,
        },
      ]}
    >
      {validHeroImageUrl ? (
        <Image
          accessibilityLabel={destination}
          accessibilityRole="image"
          source={getResolvedImageSource(validHeroImageUrl, resolvedImage)}
          style={styles.heroImage}
        />
      ) : (
        <View style={styles.placeholderPattern}>
          <MaterialIcons
            color="rgba(255, 255, 255, 0.12)"
            name="travel-explore"
            size={140}
            style={styles.watermarkIcon}
          />
        </View>
      )}

      <ImageAttribution attribution={resolvedImage?.attribution} />

      {/* Gradient / Content overlay with clearance for TopBar and Bento Card */}
      <View
        style={[
          styles.gradientOverlay,
          {
            paddingTop: topInset + 48,
            backgroundColor: hasValidPhoto
              ? "rgba(0, 0, 0, 0.38)"
              : "transparent",
          },
        ]}
      >
        <View style={styles.contentWrap}>
          <Text numberOfLines={2} style={styles.destinationTitle}>
            {destination}
          </Text>
          <View
            style={[
              styles.metaRow,
              {
                backgroundColor:
                  effectiveTheme === "dark"
                    ? "rgba(30, 31, 36, 0.88)"
                    : "rgba(255, 255, 255, 0.92)",
              },
            ]}
          >
            <MaterialIcons
              color={colors.brand.primary}
              name="calendar-today"
              size={14}
            />
            <Text
              style={[
                styles.metaText,
                {
                  color:
                    effectiveTheme === "dark" ? colors.text.primary : "#1C1B1B",
                },
              ]}
            >
              {dateLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  placeholderPattern: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: spacing.lg,
  },
  watermarkIcon: {
    transform: [{ rotate: "-12deg" }],
  },
  gradientOverlay: {
    bottom: 0,
    justifyContent: "flex-end",
    left: 0,
    paddingBottom: 28,
    paddingHorizontal: spacing.lg,
    position: "absolute",
    right: 0,
    top: 0,
  },
  contentWrap: {
    gap: spacing.xs,
  },
  destinationTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.3,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metaRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
});
