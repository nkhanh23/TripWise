import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppText } from "../../../components/AppText";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { RouteStep } from "../types";

type Props = {
  step: RouteStep;
  isLast: boolean;
};

export const RouteStepItem = memo(function RouteStepItem({
  step,
  isLast,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityLabel={`${step.instruction}, ${step.distanceLabel}`}
      accessibilityRole="text"
      style={styles.container}
    >
      {/* Left Timeline Column */}
      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.background.surfaceVariant,
              borderColor: colors.border.default,
            },
          ]}
        >
          <MaterialIcons
            color={colors.text.secondary}
            name={step.iconName}
            size={15}
          />
        </View>
        {!isLast ? (
          <View
            style={[
              styles.verticalLine,
              { backgroundColor: colors.border.subtle },
            ]}
          />
        ) : null}
      </View>

      {/* Right Content Column */}
      <View style={styles.contentColumn}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={2}
            style={[styles.instructionText, { color: colors.text.primary }]}
          >
            {step.instruction}
          </Text>
          {step.time ? (
            <Text style={[styles.timeText, { color: colors.brand.primary }]}>
              {step.time}
            </Text>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>
            {step.distanceLabel}
          </Text>
          {step.durationLabel ? (
            <>
              <Text style={[styles.dotSeparator, { color: colors.text.muted }]}>
                •
              </Text>
              <Text style={[styles.metaText, { color: colors.text.secondary }]}>
                Approx. {step.durationLabel}
              </Text>
            </>
          ) : null}
        </View>

        {step.subDetail ? (
          <AppText numberOfLines={2} style={styles.subDetailText}>
            {step.subDetail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
  },
  timelineColumn: {
    alignItems: "center",
    width: 28,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
    zIndex: 2,
  },
  verticalLine: {
    bottom: -8,
    position: "absolute",
    top: 28,
    width: 2,
    zIndex: 1,
  },
  contentColumn: {
    flex: 1,
    gap: 3,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  instructionText: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
    marginRight: spacing.xs,
  },
  timeText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  metaText: {
    fontSize: typography.bodySmall,
  },
  dotSeparator: {
    fontSize: typography.bodySmall,
  },
  subDetailText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});
