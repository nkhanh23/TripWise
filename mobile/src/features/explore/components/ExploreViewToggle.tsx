import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { ExploreViewMode } from "../types";

type Props = {
  viewMode: ExploreViewMode;
  onToggle: () => void;
};

export const ExploreViewToggle = memo(function ExploreViewToggle({
  viewMode,
  onToggle,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isMap = viewMode === "map";

  return (
    <View pointerEvents="box-none" style={styles.floatingWrapper}>
      <Pressable
        accessibilityHint={
          isMap
            ? "Chuyển sang chế độ danh sách các địa điểm"
            : "Chuyển sang chế độ xem bản đồ tương tác"
        }
        accessibilityLabel={
          isMap ? "Chuyển sang chế độ danh sách" : "Chuyển sang chế độ bản đồ"
        }
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => [
          styles.toggleButton,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
          },
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons
          color={colors.brand.primary}
          name={isMap ? "format-list-bulleted" : "map"}
          size={18}
        />
        <Text style={[styles.label, { color: colors.text.primary }]}>
          {isMap ? t("explore.listView") : t("explore.mapView")}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  floatingWrapper: {
    alignItems: "center",
    bottom: 24,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 35,
  },
  toggleButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 6,
    flexDirection: "row",
    gap: spacing.xs,
    height: 42,
    paddingHorizontal: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
