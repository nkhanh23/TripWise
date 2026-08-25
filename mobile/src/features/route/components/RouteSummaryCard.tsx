import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppText } from "../../../components/AppText";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { MockRouteData } from "../types";

type Props = {
  route: MockRouteData;
};

export const RouteSummaryCard = memo(function RouteSummaryCard({
  route,
}: Props) {
  const { colors, effectiveTheme } = useTheme();

  const getModeIconName = (): keyof typeof MaterialIcons.glyphMap => {
    switch (route.transportMode) {
      case "transit":
        return "train";
      case "driving":
        return "directions-car";
      case "cycling":
        return "directions-bike";
      case "walking":
      default:
        return "directions-walk";
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.leftColumn}>
          <Text style={[styles.durationText, { color: colors.brand.primary }]}>
            {route.durationLabel}
          </Text>
          <Text style={[styles.summaryText, { color: colors.text.secondary }]}>
            {route.routeSummary}
          </Text>
        </View>

        <View style={styles.rightColumn}>
          {route.estimatedCost ? (
            <Text style={[styles.costText, { color: colors.text.primary }]}>
              {route.estimatedCost}
            </Text>
          ) : null}
          <Text style={[styles.distanceText, { color: colors.text.muted }]}>
            {route.distanceLabel}
          </Text>
        </View>
      </View>

      {/* Traffic / Arrival Notice */}
      {route.trafficLabel ? (
        <View
          style={[
            styles.trafficRow,
            {
              backgroundColor:
                effectiveTheme === "dark" ? "#1A2E44" : "#F3F8FF",
            },
          ]}
        >
          <MaterialIcons color={colors.brand.primary} name="bolt" size={14} />
          <AppText
            style={[styles.trafficText, { color: colors.brand.primary }]}
          >
            {route.trafficLabel}
          </AppText>
        </View>
      ) : null}

      {/* Mini Timeline Representation */}
      <View style={styles.timelineRow}>
        <MaterialIcons
          color={colors.text.secondary}
          name="directions-walk"
          size={16}
        />
        <View
          style={[
            styles.timelineTrack,
            { backgroundColor: colors.background.surfaceVariant },
          ]}
        >
          <View
            style={[
              styles.timelineFill,
              { backgroundColor: colors.brand.primary },
            ]}
          />
        </View>
        <MaterialIcons
          color={colors.brand.primary}
          name={getModeIconName()}
          size={16}
        />
        <View
          style={[
            styles.timelineTrack,
            { backgroundColor: colors.background.surfaceVariant },
          ]}
        >
          <View
            style={[
              styles.timelineFill,
              { backgroundColor: colors.brand.primary },
            ]}
          />
        </View>
        <MaterialIcons
          color={colors.state.error}
          name="location-on"
          size={16}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 3,
    gap: spacing.sm,
    marginVertical: spacing.xs,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  leftColumn: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },
  rightColumn: {
    alignItems: "flex-end",
    gap: 2,
  },
  durationText: {
    fontSize: typography.title,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 32,
  },
  summaryText: {
    fontSize: typography.bodySmall,
  },
  costText: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  distanceText: {
    fontSize: typography.bodySmall,
  },
  trafficRow: {
    alignItems: "center",
    borderRadius: radius.input,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  trafficText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  timelineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  timelineTrack: {
    borderRadius: radius.pill,
    flex: 1,
    height: 4,
    overflow: "hidden",
  },
  timelineFill: {
    height: "100%",
    width: "100%",
  },
});
