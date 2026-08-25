import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "../../../i18n";
import type { RootStackParamList } from "../../../navigation/types";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { ThemePreference } from "../../../theme/types";

type Props = NativeStackScreenProps<RootStackParamList, "AppearanceSettings">;

type ThemeOption = {
  key: ThemePreference;
  titleKey: string;
  descKey: string;
  iconName: "brightness-auto" | "light-mode" | "dark-mode";
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    key: "system",
    titleKey: "settings.theme.system",
    descKey: "settings.theme.systemDesc",
    iconName: "brightness-auto",
  },
  {
    key: "light",
    titleKey: "settings.theme.light",
    descKey: "settings.theme.lightDesc",
    iconName: "light-mode",
  },
  {
    key: "dark",
    titleKey: "settings.theme.dark",
    descKey: "settings.theme.darkDesc",
    iconName: "dark-mode",
  },
];

export const AppearanceSettingsScreen = memo(function AppearanceSettingsScreen({
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme, themePreference, setThemePreference } =
    useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background.canvas,
          paddingTop: insets.top,
        },
      ]}
    >
      {/* Top App Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor:
              effectiveTheme === "dark"
                ? "rgba(19, 20, 24, 0.95)"
                : "rgba(252, 249, 248, 0.95)",
            borderBottomColor: colors.border.subtle,
          },
        ]}
      >
        <Pressable
          accessibilityHint="Go back to Settings"
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor:
                effectiveTheme === "dark"
                  ? "rgba(30, 31, 36, 0.9)"
                  : "rgba(255, 255, 255, 0.9)",
            },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            color={colors.brand.primary}
            name="arrow-back"
            size={22}
          />
        </Pressable>

        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t("settings.theme.title")}
        </Text>

        <View style={styles.spacer} />
      </View>

      {/* Main Content */}
      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        <Text style={[styles.description, { color: colors.text.muted }]}>
          {t("settings.theme.description")}
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.subtle,
            },
          ]}
        >
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = themePreference === option.key;
            const isLast = index === THEME_OPTIONS.length - 1;

            return (
              <View key={option.key}>
                <Pressable
                  accessibilityHint={t(option.descKey)}
                  accessibilityLabel={t(option.titleKey)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setThemePreference(option.key)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    pressed && styles.pressed,
                    {
                      backgroundColor: isSelected
                        ? effectiveTheme === "dark"
                          ? "rgba(216, 228, 242, 0.08)"
                          : "rgba(0, 88, 188, 0.04)"
                        : "transparent",
                    },
                  ]}
                >
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isSelected
                            ? colors.brand.primaryContainer
                            : effectiveTheme === "dark"
                              ? "rgba(255, 255, 255, 0.06)"
                              : colors.background.surfaceVariant,
                        },
                      ]}
                    >
                      <MaterialIcons
                        color={
                          isSelected
                            ? colors.brand.primary
                            : colors.text.secondary
                        }
                        name={option.iconName}
                        size={20}
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text
                        style={[
                          styles.optionTitle,
                          {
                            color: colors.text.primary,
                            fontWeight: isSelected
                              ? typography.fontWeight.bold
                              : typography.fontWeight.semibold,
                          },
                        ]}
                      >
                        {t(option.titleKey)}
                      </Text>
                      <Text
                        style={[
                          styles.optionDesc,
                          { color: colors.text.muted },
                        ]}
                      >
                        {t(option.descKey)}
                      </Text>
                    </View>
                  </View>

                  {/* Radio / Check indicator */}
                  <View
                    style={[
                      styles.radioIndicator,
                      {
                        borderColor: isSelected
                          ? colors.brand.primary
                          : colors.border.default,
                        backgroundColor: isSelected
                          ? colors.brand.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {isSelected && (
                      <MaterialIcons
                        color={colors.brand.primaryContainer}
                        name="check"
                        size={16}
                      />
                    )}
                  </View>
                </Pressable>
                {!isLast && (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.border.subtle },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  spacer: {
    height: 38,
    width: 38,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  description: {
    fontSize: typography.body,
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  optionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginRight: spacing.md,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.body,
  },
  optionDesc: {
    fontSize: typography.bodySmall,
    marginTop: 2,
  },
  radioIndicator: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  pressed: {
    opacity: 0.7,
  },
});
