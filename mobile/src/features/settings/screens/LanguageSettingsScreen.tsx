import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "../../../i18n";
import type { AppLocale } from "../../../i18n/types";
import type { RootStackParamList } from "../../../navigation/types";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "LanguageSettings">;

type LanguageOption = {
  locale: AppLocale;
  labelKey: string;
  nativeLabel: string;
  isDefault?: boolean;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    locale: "en",
    labelKey: "settings.language.en",
    nativeLabel: "English",
    isDefault: true,
  },
  {
    locale: "vi",
    labelKey: "settings.language.vi",
    nativeLabel: "Tiếng Việt",
    isDefault: false,
  },
];

export const LanguageSettingsScreen = memo(function LanguageSettingsScreen({
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();

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
          {t("settings.language.title")}
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
          {t("settings.language.description")}
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
          {LANGUAGE_OPTIONS.map((option, index) => {
            const isSelected = locale === option.locale;
            const isLast = index === LANGUAGE_OPTIONS.length - 1;

            return (
              <View key={option.locale}>
                <Pressable
                  accessibilityHint={`Switch language to ${option.nativeLabel}`}
                  accessibilityLabel={t(option.labelKey)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setLocale(option.locale)}
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
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color: colors.text.primary,
                          fontWeight: isSelected
                            ? typography.fontWeight.bold
                            : typography.fontWeight.semibold,
                        },
                      ]}
                    >
                      {option.nativeLabel}
                    </Text>
                    {option.isDefault && (
                      <View
                        style={[
                          styles.defaultBadge,
                          { backgroundColor: colors.background.surfaceVariant },
                        ]}
                      >
                        <Text
                          style={[
                            styles.defaultBadgeText,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {t("settings.language.defaultBadge")}
                        </Text>
                      </View>
                    )}
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
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  optionLabel: {
    fontSize: typography.body,
  },
  defaultBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
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
    marginLeft: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
});
