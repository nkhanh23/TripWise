import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { AppText } from "../../../components/AppText";
import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { ItineraryItem } from "../types";
import type { ResolvedImage } from "../../../integration/contracts";
import { ImageAttribution } from "../../images/components/ImageAttribution";
import { getResolvedImageSource } from "../../images/resolvedImageSource";

type Props = {
  item: ItineraryItem;
  resolvedImage?: ResolvedImage;
  isFirst?: boolean;
  isLast?: boolean;
  onPressItem?: (item: ItineraryItem) => void;
  onGetDirections?: (item: ItineraryItem) => void;
  onResolve?: (item: ItineraryItem) => void;
  resolutionStatus?: "UNRESOLVED_IDLE" | "RESOLVING" | "VERIFIED" | "ERROR";
};

export const ItineraryCard = memo(function ItineraryCard({
  item,
  resolvedImage = item.resolvedImage,
  isFirst = false,
  isLast = false,
  onPressItem,
  onGetDirections,
  onResolve,
  resolutionStatus = item.resolution === "VERIFIED"
    ? "VERIFIED"
    : "UNRESOLVED_IDLE",
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const getBadgeStyle = () => {
    switch (item.iconBgVariant) {
      case "tertiary":
        return {
          bg: effectiveTheme === "dark" ? "#5C1D1D" : "#FFDAD5",
          iconColor: effectiveTheme === "dark" ? "#FFDAD5" : "#930005",
        };
      case "secondary":
        return {
          bg: effectiveTheme === "dark" ? "#1E354D" : "#D8E4F2",
          iconColor: effectiveTheme === "dark" ? "#D8E4F2" : "#5A6671",
        };
      case "primary":
      default:
        return {
          bg: effectiveTheme === "dark" ? "#1E3A5F" : "#D8E2FF",
          iconColor: colors.brand.primary,
        };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <View style={styles.container}>
      {/* 1. Left Timeline Column */}
      <View style={styles.timelineColumn}>
        {/* Continuous Vertical Line */}
        {!isLast ? (
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: colors.border.subtle },
            ]}
          />
        ) : null}

        {/* Timeline Node Dot */}
        <View
          style={[
            styles.timelineNode,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
            isFirst && [
              styles.timelineNodeFirst,
              { borderColor: colors.brand.primary },
            ],
          ]}
        >
          {isFirst ? (
            <View
              style={[
                styles.timelineNodeInner,
                { backgroundColor: colors.brand.primary },
              ]}
            />
          ) : null}
        </View>
      </View>

      <Pressable
        testID={`itinerary-item-${item.id}`}
        accessibilityHint={
          item.placeId && onPressItem ? `Xem chi tiết ${item.title}` : undefined
        }
        accessibilityLabel={`${item.time} ${item.timePeriod || ""}, ${item.title}, ${item.subtitle || ""}`}
        accessibilityRole={item.placeId && onPressItem ? "button" : "none"}
        accessibilityState={{ disabled: !item.placeId || !onPressItem }}
        disabled={!item.placeId || !onPressItem}
        onPress={() => onPressItem?.(item)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
          },
          pressed && item.placeId && onPressItem && styles.cardPressed,
        ]}
      >
        {/* Time Column */}
        <View style={styles.timeColumn}>
          <Text style={[styles.timeText, { color: colors.text.primary }]}>
            {item.time}
          </Text>
          {item.timePeriod ? (
            <Text style={[styles.periodText, { color: colors.text.muted }]}>
              {item.timePeriod}
            </Text>
          ) : null}
        </View>

        {/* Right Info Column */}
        <View style={styles.infoColumn}>
          {/* Title & Category Badge Header */}
          <View style={styles.titleRow}>
            <View style={styles.titleTextWrap}>
              <Text
                numberOfLines={1}
                style={[styles.itemTitle, { color: colors.text.primary }]}
              >
                {item.title}
              </Text>
              {item.subtitle ? (
                <AppText numberOfLines={2} style={styles.itemSubtitle}>
                  {item.subtitle}
                </AppText>
              ) : null}
            </View>

            {/* Category Icon Badge */}
            <Pressable
              accessibilityHint={`Xem lộ trình di chuyển tới ${item.title}`}
              accessibilityLabel={`Lộ trình tới ${item.title}`}
              accessibilityRole="button"
              onPress={() => onGetDirections?.(item)}
              style={[styles.categoryBadge, { backgroundColor: badgeStyle.bg }]}
            >
              <MaterialIcons
                color={badgeStyle.iconColor}
                name={item.iconName}
                size={18}
              />
            </Pressable>
          </View>

          {/* Optional Card Image */}
          {(resolvedImage?.uri ?? item.imageUrl) ? (() => {
            const displayUri = (resolvedImage?.uri ?? item.imageUrl) as string;
            return (
            <View style={styles.imageWrap}>
              <Image
                accessible={false}
                source={getResolvedImageSource(
                  displayUri,
                  resolvedImage,
                )}
                style={styles.cardImage}
              />
              <ImageAttribution attribution={resolvedImage?.attribution} />
            </View>
          );
          })() : null}

          {/* Optional Get Directions CTA matching Stitch */}
          {item.directionsLabel ? (
            <Pressable
              accessibilityHint={`Xem lộ trình di chuyển tới ${item.title}`}
              accessibilityLabel={item.directionsLabel}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onGetDirections?.(item)}
              style={styles.directionsRow}
            >
              <MaterialIcons
                color={colors.brand.primary}
                name="directions"
                size={16}
              />
              <Text
                style={[styles.directionsText, { color: colors.brand.primary }]}
              >
                {item.directionsLabel}
              </Text>
            </Pressable>
          ) : null}
          {item.resolution !== "VERIFIED" && onResolve ? (
            <Pressable
              accessibilityLabel={
                resolutionStatus === "RESOLVING"
                  ? t("trips.resolvingPlace")
                  : t("trips.resolvePlace")
              }
              accessibilityRole="button"
              disabled={resolutionStatus === "RESOLVING"}
              onPress={() => onResolve(item)}
              style={styles.resolveRow}
            >
              <MaterialIcons
                color={colors.brand.primary}
                name={
                  resolutionStatus === "RESOLVING"
                    ? "hourglass-top"
                    : "verified"
                }
                size={16}
              />
              <Text
                style={[styles.directionsText, { color: colors.brand.primary }]}
              >
                {resolutionStatus === "RESOLVING"
                  ? t("trips.resolvingPlace")
                  : resolutionStatus === "ERROR"
                    ? t("trips.retryResolve")
                    : t("trips.resolvePlace")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: spacing.md,
    position: "relative",
  },
  timelineColumn: {
    alignItems: "center",
    width: 28,
  },
  timelineLine: {
    bottom: -spacing.md,
    position: "absolute",
    top: 20,
    width: 2,
  },
  timelineNode: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 16,
    justifyContent: "center",
    marginTop: 14,
    width: 16,
    zIndex: 2,
  },
  timelineNodeFirst: {},
  timelineNodeInner: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginLeft: 6,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  timeColumn: {
    alignItems: "center",
    minWidth: 44,
    paddingTop: 2,
  },
  timeText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  periodText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
  },
  infoColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  titleTextWrap: {
    flex: 1,
    gap: 2,
    marginRight: spacing.xs,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  itemSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  categoryBadge: {
    alignItems: "center",
    borderRadius: radius.card,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  imageWrap: {
    borderRadius: radius.input,
    height: 96,
    marginTop: 4,
    overflow: "hidden",
    width: "100%",
  },
  cardImage: {
    height: "100%",
    width: "100%",
  },
  directionsRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  directionsText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  resolveRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
