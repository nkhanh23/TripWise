import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";

type Props = {
  onPressMenu?: () => void;
  onPressProfile?: () => void;
};

export const HomeTopBar = memo(function HomeTopBar({
  onPressMenu,
  onPressProfile,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background.surface,
          borderBottomColor: colors.border.default,
          paddingTop: Math.max(insets.top, spacing.sm),
        },
      ]}
    >
      <Pressable
        accessibilityHint={t("common.menu")}
        accessibilityLabel={t("common.menu")}
        accessibilityRole="button"
        onPress={onPressMenu}
        style={styles.iconButton}
      >
        <MaterialIcons color={colors.text.secondary} name="menu" size={24} />
      </Pressable>

      <Text style={[styles.brandTitle, { color: colors.brand.primary }]}>
        {t("common.appName")}
      </Text>

      <Pressable
        accessibilityHint={t("navigation.tabs.profile")}
        accessibilityLabel={t("navigation.tabs.profile")}
        accessibilityRole="button"
        onPress={onPressProfile}
        style={[
          styles.avatarButton,
          { backgroundColor: colors.background.surfaceVariant },
        ]}
      >
        <MaterialIcons
          color={colors.brand.primary}
          name="account-circle"
          size={24}
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 64,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
  avatarButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    overflow: "hidden",
    width: 36,
  },
});
