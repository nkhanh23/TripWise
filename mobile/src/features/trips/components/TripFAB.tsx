import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "../../../theme";
import { radius, spacing } from "../../../theme/tokens";

type Props = {
  onPress: () => void;
  bottomInset?: number;
  disabled?: boolean;
};

export const TripFAB = memo(function TripFAB({
  onPress,
  bottomInset = 0,
  disabled = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityHint="Thêm địa điểm hoặc hoạt động vào lịch trình"
      accessibilityLabel="Thêm địa điểm"
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: colors.brand.primary,
          bottom: spacing.xl + bottomInset,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && !disabled && styles.pressed,
      ]}
    >
      <MaterialIcons color={colors.text.inverse} name="add" size={28} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fab: {
    alignItems: "center",
    borderRadius: radius.card,
    elevation: 8,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: 56,
    zIndex: 40,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
});
