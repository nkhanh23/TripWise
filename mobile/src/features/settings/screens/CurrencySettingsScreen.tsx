import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { memo, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "../../../i18n";
import type { RootStackParamList } from "../../../navigation/types";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import { SUPPORTED_CURRENCIES } from "../data/settingsStore";
import { useSettings } from "../hooks/useSettings";
import type { CurrencyCode } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "CurrencySettings">;

export const CurrencySettingsScreen = memo(function CurrencySettingsScreen({
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const { currency: selectedCurrency, setCurrency } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.defaultName.toLowerCase().includes(q) ||
        c.defaultCountry.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const suggestedCurrencies = useMemo(
    () => filteredCurrencies.filter((c) => c.isSuggested),
    [filteredCurrencies],
  );

  const allCurrencies = useMemo(
    () =>
      searchQuery
        ? filteredCurrencies
        : filteredCurrencies.filter((c) => !c.isSuggested),
    [filteredCurrencies, searchQuery],
  );

  const handleSelect = (code: CurrencyCode) => {
    setCurrency(code);
  };

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
          {t("settings.currency.title")}
        </Text>

        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor:
                effectiveTheme === "dark"
                  ? "rgba(255, 255, 255, 0.06)"
                  : colors.background.surfaceVariant,
            },
          ]}
        >
          <MaterialIcons
            color={colors.icon.muted}
            name="search"
            size={20}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityLabel={t("settings.currency.searchPlaceholder")}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchQuery}
            placeholder={t("settings.currency.searchPlaceholder")}
            placeholderTextColor={colors.text.muted}
            style={[styles.searchInput, { color: colors.text.primary }]}
            value={searchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSearchQuery("")}
            >
              <MaterialIcons
                color={colors.icon.muted}
                name="cancel"
                size={18}
              />
            </Pressable>
          )}
        </View>

        {/* Suggested Section (if not actively filtering out of suggested) */}
        {!searchQuery && suggestedCurrencies.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>
              {t("settings.currency.suggested")}
            </Text>
            <View style={styles.grid}>
              {suggestedCurrencies.map((item) => {
                const isSelected = selectedCurrency === item.code;

                return (
                  <Pressable
                    accessibilityHint={`Select ${item.defaultName}`}
                    accessibilityLabel={`${item.code}, ${item.defaultName}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    key={item.code}
                    onPress={() => handleSelect(item.code)}
                    style={({ pressed }) => [
                      styles.suggestedCard,
                      {
                        backgroundColor: isSelected
                          ? effectiveTheme === "dark"
                            ? "rgba(0, 88, 188, 0.15)"
                            : "rgba(0, 88, 188, 0.06)"
                          : colors.background.surface,
                        borderColor: isSelected
                          ? colors.brand.primary
                          : colors.border.subtle,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.suggestedCardLeft}>
                      <View
                        style={[
                          styles.currencyBadge,
                          {
                            backgroundColor: isSelected
                              ? colors.brand.primaryContainer
                              : colors.background.surfaceVariant,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.currencyBadgeText,
                            {
                              color: isSelected
                                ? colors.brand.primary
                                : colors.text.secondary,
                            },
                          ]}
                        >
                          {item.code}
                        </Text>
                      </View>
                      <View style={styles.suggestedTextCol}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.currencyName,
                            {
                              color: colors.text.primary,
                              fontWeight: isSelected
                                ? typography.fontWeight.bold
                                : typography.fontWeight.semibold,
                            },
                          ]}
                        >
                          {item.defaultName}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.currencyCountry,
                            { color: colors.text.muted },
                          ]}
                        >
                          {item.defaultCountry}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <MaterialIcons
                        color={colors.brand.primary}
                        name="check-circle"
                        size={20}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* All Currencies List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>
            {searchQuery
              ? t("settings.currency.all")
              : t("settings.currency.all")}
          </Text>

          {allCurrencies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text.muted }]}>
                {t("settings.currency.noResults")}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.listCard,
                {
                  backgroundColor: colors.background.surface,
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              {allCurrencies.map((item, index) => {
                const isSelected = selectedCurrency === item.code;
                const isLast = index === allCurrencies.length - 1;

                return (
                  <View key={item.code}>
                    <Pressable
                      accessibilityHint={`Select ${item.defaultName}`}
                      accessibilityLabel={`${item.code}, ${item.defaultName}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => handleSelect(item.code)}
                      style={({ pressed }) => [
                        styles.listItem,
                        {
                          backgroundColor: isSelected
                            ? effectiveTheme === "dark"
                              ? "rgba(216, 228, 242, 0.08)"
                              : "rgba(0, 88, 188, 0.04)"
                            : "transparent",
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.listItemLeft}>
                        <View
                          style={[
                            styles.listBadge,
                            {
                              backgroundColor: isSelected
                                ? colors.brand.primaryContainer
                                : colors.background.surfaceVariant,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.listBadgeText,
                              {
                                color: isSelected
                                  ? colors.brand.primary
                                  : colors.text.secondary,
                              },
                            ]}
                          >
                            {item.code}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.listItemName,
                              {
                                color: colors.text.primary,
                                fontWeight: isSelected
                                  ? typography.fontWeight.bold
                                  : typography.fontWeight.semibold,
                              },
                            ]}
                          >
                            {item.defaultName}
                          </Text>
                          <Text
                            style={[
                              styles.listItemCountry,
                              { color: colors.text.muted },
                            ]}
                          >
                            {item.defaultCountry}
                          </Text>
                        </View>
                      </View>

                      {isSelected && (
                        <MaterialIcons
                          color={colors.brand.primary}
                          name="check"
                          size={20}
                        />
                      )}
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
          )}
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  searchContainer: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    height: 48,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    height: "100%",
    padding: 0,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    textTransform: "uppercase",
  },
  grid: {
    gap: spacing.md,
  },
  suggestedCard: {
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  suggestedCardLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  currencyBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  currencyBadgeText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  suggestedTextCol: {
    flex: 1,
  },
  currencyName: {
    fontSize: typography.body,
  },
  currencyCountry: {
    fontSize: typography.bodySmall,
    marginTop: 2,
  },
  listCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  listItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  listItemLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  listBadge: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 46,
  },
  listBadgeText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  listItemName: {
    fontSize: typography.body,
  },
  listItemCountry: {
    fontSize: typography.bodySmall,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 74,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.body,
  },
  pressed: {
    opacity: 0.7,
  },
});
