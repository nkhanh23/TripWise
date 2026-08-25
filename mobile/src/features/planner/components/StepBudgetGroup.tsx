import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppText } from "../../../components/AppText";
import { colors, radius, spacing, typography } from "../../../theme/tokens";
import { mockBudgetOptions, mockGroupOptions } from "../data/mockWizardData";
import type { BudgetTier, GroupType } from "../types";

type Props = {
  selectedBudget: BudgetTier;
  selectedGroup: GroupType;
  onSelectBudget: (budget: BudgetTier) => void;
  onSelectGroup: (group: GroupType) => void;
};

export const StepBudgetGroup = memo(function StepBudgetGroup({
  selectedBudget,
  selectedGroup,
  onSelectBudget,
  onSelectGroup,
}: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppText style={styles.subtitle}>
        Set your spending comfort zone and who you are traveling with.
      </AppText>

      {/* Section 1: Budget Tier */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget Level</Text>
        <View style={styles.budgetList}>
          {mockBudgetOptions.map((opt) => {
            const isSelected = selectedBudget === opt.id;

            return (
              <Pressable
                accessibilityHint={`Chọn mức ngân sách ${opt.label}, ${opt.rangeText}`}
                accessibilityLabel={`${opt.label}, ${opt.rangeText}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={opt.id}
                onPress={() => onSelectBudget(opt.id)}
                style={({ pressed }) => [
                  styles.budgetCard,
                  isSelected && styles.budgetCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.budgetIconCircle,
                    isSelected && styles.budgetIconCircleSelected,
                  ]}
                >
                  <MaterialIcons
                    color={
                      isSelected ? colors.text.inverse : colors.brand.primary
                    }
                    name={opt.iconName}
                    size={22}
                  />
                </View>

                <View style={styles.budgetInfo}>
                  <View style={styles.budgetTitleRow}>
                    <Text style={styles.budgetLabel}>{opt.label}</Text>
                    <Text style={styles.rangeText}>{opt.rangeText}</Text>
                  </View>
                  <AppText style={styles.budgetDesc}>{opt.description}</AppText>
                </View>

                {isSelected ? (
                  <MaterialIcons
                    color={colors.brand.primary}
                    name="check-circle"
                    size={20}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Section 2: Who's Traveling */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Who&apos;s Traveling?</Text>
        <View style={styles.groupGrid}>
          {mockGroupOptions.map((grp) => {
            const isSelected = selectedGroup === grp.id;

            return (
              <Pressable
                accessibilityHint={`Chọn loại đối tượng đồng hành ${grp.label}, ${grp.travelerCountLabel}`}
                accessibilityLabel={`${grp.label}, ${grp.travelerCountLabel}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={grp.id}
                onPress={() => onSelectGroup(grp.id)}
                style={({ pressed }) => [
                  styles.groupCard,
                  isSelected && styles.groupCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.groupIconCircle,
                    isSelected && styles.groupIconCircleSelected,
                  ]}
                >
                  <MaterialIcons
                    color={
                      isSelected ? colors.text.inverse : colors.brand.primary
                    }
                    name={grp.iconName}
                    size={22}
                  />
                </View>
                <Text
                  style={[
                    styles.groupLabel,
                    isSelected && styles.groupLabelSelected,
                  ]}
                >
                  {grp.label}
                </Text>
                <Text style={styles.groupSub}>{grp.travelerCountLabel}</Text>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  budgetList: {
    gap: spacing.sm,
  },
  budgetCard: {
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
  budgetCardSelected: {
    backgroundColor: "#F3F8FF",
    borderColor: colors.brand.primary,
    borderWidth: 1.5,
  },
  budgetIconCircle: {
    alignItems: "center",
    backgroundColor: "#E8F1FC",
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  budgetIconCircleSelected: {
    backgroundColor: colors.brand.primary,
  },
  budgetInfo: {
    flex: 1,
    gap: 2,
  },
  budgetTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetLabel: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  rangeText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  budgetDesc: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  groupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  groupCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    gap: 4,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    width: "47.5%",
  },
  groupCardSelected: {
    backgroundColor: "#F3F8FF",
    borderColor: colors.brand.primary,
    borderWidth: 1.5,
  },
  groupIconCircle: {
    alignItems: "center",
    backgroundColor: "#F0EDED",
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    marginBottom: 2,
    width: 44,
  },
  groupIconCircleSelected: {
    backgroundColor: colors.brand.primary,
  },
  groupLabel: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  groupLabelSelected: {
    color: colors.brand.primary,
  },
  groupSub: {
    color: colors.text.muted,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
