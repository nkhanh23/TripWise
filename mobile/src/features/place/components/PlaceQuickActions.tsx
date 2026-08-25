import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";

type Props = {
  onRoute?: () => void;
  onWebsite?: () => void;
  onCall?: () => void;
  onAdd?: () => void;
};

export const PlaceQuickActions = memo(function PlaceQuickActions({
  onRoute,
  onWebsite,
  onCall,
  onAdd,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.gridContainer}>
      <Pressable
        accessibilityHint="Xem tuyến đường di chuyển tới địa điểm"
        accessibilityLabel="Chỉ đường"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled={true}
        onPress={onRoute}
        style={({ pressed }) => [
          styles.actionCard,
          { backgroundColor: colors.background.surfaceVariant },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor:
                effectiveTheme === "dark" ? "#1E3A5F" : "#D8E2FF",
            },
          ]}
        >
          <MaterialIcons
            color={colors.brand.primary}
            name="directions"
            size={22}
          />
        </View>
        <Text style={[styles.actionLabel, { color: colors.brand.primary }]}>
          {t("place.route")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityHint="Truy cập trang web chính thức của địa điểm"
        accessibilityLabel="Trang web"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled={true}
        onPress={onWebsite}
        style={({ pressed }) => [
          styles.actionCard,
          { backgroundColor: colors.background.surfaceVariant, opacity: 0.5 },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.background.surface },
          ]}
        >
          <MaterialIcons
            color={colors.text.secondary}
            name="language"
            size={22}
          />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text.primary }]}>
          {t("place.website")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityHint="Gọi điện thoại liên hệ địa điểm"
        accessibilityLabel="Gọi điện"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled={true}
        onPress={onCall}
        style={({ pressed }) => [
          styles.actionCard,
          { backgroundColor: colors.background.surfaceVariant, opacity: 0.5 },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.background.surface },
          ]}
        >
          <MaterialIcons color={colors.text.secondary} name="call" size={22} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text.primary }]}>
          {t("place.call")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityHint="Thêm địa điểm này vào lịch trình chuyến đi của bạn"
        accessibilityLabel="Thêm vào chuyến đi"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled={true}
        onPress={onAdd}
        style={({ pressed }) => [
          styles.actionCard,
          { backgroundColor: colors.background.surfaceVariant, opacity: 0.5 },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.background.surface },
          ]}
        >
          <MaterialIcons
            color={colors.text.secondary}
            name="bookmark-add"
            size={22}
          />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text.primary }]}>
          {t("place.addToTrip")}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginVertical: spacing.md,
  },
  actionCard: {
    alignItems: "center",
    borderRadius: radius.card,
    flex: 1,
    gap: 6,
    paddingVertical: spacing.md,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
