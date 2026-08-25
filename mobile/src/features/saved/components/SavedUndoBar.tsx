import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
type Props = {
  removedPlace: { name: string } | null;
  onUndo: () => void;
  onDismiss: () => void;
};

export const SavedUndoBar = memo(function SavedUndoBar({
  removedPlace,
  onUndo,
  onDismiss,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  if (!removedPlace) return null;

  const noticeText = removedPlace
    ? t("savedPlaces.removedNotice", { name: removedPlace.name })
    : t("savedPlaces.removedFromSaved");

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor:
            effectiveTheme === "dark"
              ? colors.background.surface
              : colors.text.primary,
          borderColor: colors.border.default,
        },
      ]}
    >
      {/* Icon + Message */}
      <View style={styles.messageRow}>
        <MaterialIcons
          color={colors.brand.primary}
          name="bookmark-border"
          size={20}
        />
        <Text
          numberOfLines={1}
          style={[styles.messageText, { color: colors.text.inverse }]}
        >
          {noticeText}
        </Text>
      </View>

      {/* Action Buttons: Undo + Dismiss */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityHint={t("savedPlaces.undo")}
          accessibilityLabel={t("savedPlaces.undo")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onUndo}
          style={({ pressed }) => [
            styles.undoButton,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.undoText,
              {
                color: colors.brand.primary,
              },
            ]}
          >
            {t("savedPlaces.undo")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint={t("common.close")}
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons color={colors.text.muted} name="close" size={18} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    bottom: spacing.lg,
    elevation: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    left: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: "absolute",
    right: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 100,
  },
  messageRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  messageText: {
    flex: 1,
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.regular,
  },
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  undoButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  undoText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  closeButton: {
    padding: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
