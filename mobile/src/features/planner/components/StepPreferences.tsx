import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppText } from "../../../components/AppText";
import { colors, radius, spacing, typography } from "../../../theme/tokens";
import { mockPaceOptions, mockTravelStyles } from "../data/mockWizardData";
import type { TravelPace } from "../types";

type Props = {
  selectedStyles: string[];
  selectedPace: TravelPace;
  onToggleStyle: (styleId: string) => void;
  onSelectPace: (pace: TravelPace) => void;
  error?: string | null;
};

export const StepPreferences = memo(function StepPreferences({
  selectedStyles,
  selectedPace,
  onToggleStyle,
  onSelectPace,
  error,
}: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppText style={styles.subtitle}>
        Tailor your experience by choosing what you love most.
      </AppText>

      {/* Error Alert */}
      {error ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <MaterialIcons
            color={colors.brand.red}
            name="error-outline"
            size={16}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Section 1: Travel Interests */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Travel Interests</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {selectedStyles.length} selected
            </Text>
          </View>
        </View>

        <View style={styles.stylesGrid}>
          {mockTravelStyles.map((style) => {
            const isSelected = selectedStyles.includes(style.id);

            return (
              <Pressable
                accessibilityHint={`Chọn sở thích du lịch ${style.label}`}
                accessibilityLabel={style.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={style.id}
                onPress={() => onToggleStyle(style.id)}
                style={({ pressed }) => [
                  styles.styleCard,
                  isSelected && styles.styleCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.styleIconCircle,
                    isSelected && styles.styleIconCircleSelected,
                  ]}
                >
                  <MaterialIcons
                    color={
                      isSelected ? colors.text.inverse : colors.brand.primary
                    }
                    name={style.iconName}
                    size={20}
                  />
                </View>
                <View style={styles.styleContent}>
                  <Text
                    style={[
                      styles.styleLabel,
                      isSelected && styles.styleLabelSelected,
                    ]}
                  >
                    {style.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.styleDesc}>
                    {style.description}
                  </Text>
                </View>
                {isSelected ? (
                  <MaterialIcons
                    color={colors.brand.primary}
                    name="check-circle"
                    size={18}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Section 2: Travel Pace */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Pace</Text>
        <View style={styles.paceList}>
          {mockPaceOptions.map((opt) => {
            const isSelected = selectedPace === opt.id;

            return (
              <Pressable
                accessibilityHint={`Chọn nhịp độ chuyến đi ${opt.label}, ${opt.dailyPlacesLabel}`}
                accessibilityLabel={`${opt.label}, ${opt.dailyPlacesLabel}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={opt.id}
                onPress={() => onSelectPace(opt.id)}
                style={({ pressed }) => [
                  styles.paceCard,
                  isSelected && styles.paceCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.paceIconCircle,
                    isSelected && styles.paceIconCircleSelected,
                  ]}
                >
                  <MaterialIcons
                    color={
                      isSelected ? colors.brand.primary : colors.text.secondary
                    }
                    name={opt.iconName}
                    size={20}
                  />
                </View>

                <View style={styles.paceContent}>
                  <View style={styles.paceTitleRow}>
                    <Text style={styles.paceLabel}>{opt.label}</Text>
                    <View style={styles.dailyBadge}>
                      <Text style={styles.dailyBadgeText}>
                        {opt.dailyPlacesLabel}
                      </Text>
                    </View>
                  </View>
                  <AppText style={styles.paceDesc}>{opt.description}</AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: "#FDE8E8",
    borderRadius: radius.input,
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.brand.red,
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  countBadge: {
    backgroundColor: "#E8F1FC",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: colors.brand.primary,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  stylesGrid: {
    gap: spacing.sm,
  },
  styleCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  styleCardSelected: {
    backgroundColor: "#F3F8FF",
    borderColor: colors.brand.primary,
    borderWidth: 1.5,
  },
  styleIconCircle: {
    alignItems: "center",
    backgroundColor: "#E8F1FC",
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  styleIconCircleSelected: {
    backgroundColor: colors.brand.primary,
  },
  styleContent: {
    flex: 1,
    gap: 2,
  },
  styleLabel: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  styleLabelSelected: {
    color: colors.brand.primary,
  },
  styleDesc: {
    color: colors.text.muted,
    fontSize: 11,
  },
  paceList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  paceCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  paceCardSelected: {
    backgroundColor: "#F3F8FF",
    borderColor: colors.brand.primary,
    borderWidth: 1.5,
  },
  paceIconCircle: {
    alignItems: "center",
    backgroundColor: "#F0EDED",
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    marginTop: 2,
    width: 36,
  },
  paceIconCircleSelected: {
    backgroundColor: "#D8E2FF",
  },
  paceContent: {
    flex: 1,
    gap: 3,
  },
  paceTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paceLabel: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  dailyBadge: {
    backgroundColor: "#F0EDED",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dailyBadgeText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  paceDesc: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
