import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import { transportOptions } from "../data/mockRoutes";
import type { TransportMode } from "../types";

type Props = {
  selectedMode: TransportMode;
  onSelectMode: (mode: TransportMode) => void;
};

export const TWTransportSelector = memo(function TWTransportSelector({
  selectedMode,
  onSelectMode,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {transportOptions.map((opt) => {
        const isSelected = opt.mode === selectedMode;
        const localizedLabel =
          opt.mode === "transit"
            ? t("route.modes.transit")
            : opt.mode === "driving"
              ? t("route.modes.driving")
              : opt.mode === "walking"
                ? t("route.modes.walking")
                : t("route.modes.cycling");

        return (
          <Pressable
            accessibilityHint={`Select ${localizedLabel}`}
            accessibilityLabel={localizedLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={opt.mode}
            onPress={() => onSelectMode(opt.mode)}
            style={({ pressed }) => [
              styles.chip,
              isSelected
                ? [
                    styles.chipSelected,
                    { backgroundColor: colors.brand.primary },
                  ]
                : [
                    styles.chipUnselected,
                    {
                      backgroundColor: colors.background.surface,
                      borderColor: colors.border.default,
                    },
                  ],
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons
              color={isSelected ? colors.text.inverse : colors.text.primary}
              name={opt.iconName}
              size={18}
            />
            <Text
              style={[
                styles.label,
                isSelected
                  ? [styles.labelSelected, { color: colors.text.inverse }]
                  : [styles.labelUnselected, { color: colors.text.primary }],
              ]}
            >
              {localizedLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  chip: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  chipSelected: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  chipUnselected: {
    borderWidth: 1,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  labelSelected: {},
  labelUnselected: {},
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
