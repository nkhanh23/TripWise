import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { DraftTripData } from "../types";

type Props = {
  draft: DraftTripData;
  onPressContinue: () => void;
};

export const HomeContinuePlanningCard = memo(function HomeContinuePlanningCard({
  draft,
  onPressContinue,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const progressPercent = Math.min(
    100,
    Math.max(0, (draft.step / draft.totalSteps) * 100),
  );

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
      <View>
        {/* Drafting Header Tag */}
        <View style={styles.tagRow}>
          <MaterialIcons
            color={colors.text.secondary}
            name="architecture"
            size={16}
          />
          <Text style={[styles.tagText, { color: colors.text.secondary }]}>
            {t("home.drafting").toUpperCase()}
          </Text>
        </View>

        {/* Title */}
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.text.primary }]}
        >
          {draft.title}
        </Text>

        {/* Progress Bar & Label */}
        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: colors.background.surfaceVariant },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.brand.primary,
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.stepText, { color: colors.text.secondary }]}>
            {t("home.stepProgress", {
              step: draft.step,
              total: draft.totalSteps,
            })}
          </Text>
        </View>
      </View>

      {/* Continue CTA */}
      <Pressable
        accessibilityHint={t("home.continue")}
        accessibilityLabel={`${t("home.continue")}: ${draft.title}`}
        accessibilityRole="button"
        onPress={onPressContinue}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.background.surfaceVariant },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.brand.primary }]}>
          {t("home.continue")}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.control, // 16px matching Stitch rounded-xl
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  tagRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressBarTrack: {
    borderRadius: radius.pill,
    flex: 1,
    height: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    borderRadius: radius.pill,
    height: "100%",
  },
  stepText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: "100%",
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
});
