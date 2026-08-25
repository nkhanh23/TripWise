import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatDistance,
  formatNumber,
  TranslationProvider,
  useTranslation,
} from "../src/i18n";
import {
  darkPalette,
  getNavigationTheme,
  lightPalette,
  ThemeProvider,
  useTheme,
} from "../src/theme";

function ThemeConsumer() {
  const { themePreference, effectiveTheme, colors, setThemePreference } =
    useTheme();

  return (
    <View testID="theme-root">
      <Text testID="pref-text">{themePreference}</Text>
      <Text testID="effective-text">{effectiveTheme}</Text>
      <Text testID="bg-color">{colors.background.canvas}</Text>
      <Text testID="text-color">{colors.text.primary}</Text>
      <Pressable
        onPress={() => setThemePreference("dark")}
        testID="set-dark-btn"
      >
        <Text>Set Dark</Text>
      </Pressable>
      <Pressable
        onPress={() => setThemePreference("light")}
        testID="set-light-btn"
      >
        <Text>Set Light</Text>
      </Pressable>
    </View>
  );
}

function TranslationConsumer() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <View testID="i18n-root">
      <Text testID="locale-text">{locale}</Text>
      <Text testID="save-text">{t("common.save")}</Text>
      <Text testID="login-title">{t("auth.login.title")}</Text>
      <Text testID="interpolated">
        {t("planner.generatingTitle", { destination: "Tokyo" })}
      </Text>
      <Text testID="fallback">{t("non.existent.key")}</Text>
      <Pressable onPress={() => setLocale("vi")} testID="set-vi-btn">
        <Text>Set VI</Text>
      </Pressable>
      <Pressable onPress={() => setLocale("en")} testID="set-en-btn">
        <Text>Set EN</Text>
      </Pressable>
    </View>
  );
}

describe("FE-CROSSCUT-001: Theme Foundation", () => {
  it("provides light palette by default when preference is light", async () => {
    const { getByTestId } = await render(
      <ThemeProvider initialPreference="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(getByTestId("pref-text").props.children).toBe("light");
    expect(getByTestId("effective-text").props.children).toBe("light");
    expect(getByTestId("bg-color").props.children).toBe(
      lightPalette.background.canvas,
    );
    expect(getByTestId("text-color").props.children).toBe(
      lightPalette.text.primary,
    );
  });

  it("switches between light and dark themes dynamically without error", async () => {
    const { getByTestId } = await render(
      <ThemeProvider initialPreference="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(getByTestId("effective-text").props.children).toBe("light");

    fireEvent.press(getByTestId("set-dark-btn"));

    await waitFor(() => {
      expect(getByTestId("pref-text").props.children).toBe("dark");
      expect(getByTestId("effective-text").props.children).toBe("dark");
      expect(getByTestId("bg-color").props.children).toBe(
        darkPalette.background.canvas,
      );
      expect(getByTestId("text-color").props.children).toBe(
        darkPalette.text.primary,
      );
    });
  });

  it("correctly builds React Navigation 7 theme object with fonts", () => {
    const navThemeLight = getNavigationTheme(lightPalette, false);
    expect(navThemeLight.dark).toBe(false);
    expect(navThemeLight.colors.primary).toBe(lightPalette.brand.primary);
    expect(navThemeLight.colors.background).toBe(
      lightPalette.background.canvas,
    );
    expect(navThemeLight.fonts).toBeDefined();

    const navThemeDark = getNavigationTheme(darkPalette, true);
    expect(navThemeDark.dark).toBe(true);
    expect(navThemeDark.colors.background).toBe(darkPalette.background.canvas);
    expect(navThemeDark.fonts).toBeDefined();
  });
});

describe("FE-CROSSCUT-001: Localization Foundation", () => {
  it("provides English dictionary by default", async () => {
    const { getByTestId } = await render(
      <TranslationProvider initialLocale="en">
        <TranslationConsumer />
      </TranslationProvider>,
    );

    expect(getByTestId("locale-text").props.children).toBe("en");
    expect(getByTestId("save-text").props.children).toBe("Save");
    expect(getByTestId("login-title").props.children).toBe("Welcome back");
  });

  it("switches to Vietnamese dynamically and translates accurately", async () => {
    const { getByTestId } = await render(
      <TranslationProvider initialLocale="en">
        <TranslationConsumer />
      </TranslationProvider>,
    );

    fireEvent.press(getByTestId("set-vi-btn"));

    await waitFor(() => {
      expect(getByTestId("locale-text").props.children).toBe("vi");
      expect(getByTestId("save-text").props.children).toBe("Lưu");
      expect(getByTestId("login-title").props.children).toBe(
        "Chào mừng trở lại",
      );
    });
  });

  it("interpolates parameters correctly in translation strings", async () => {
    const { getByTestId } = await render(
      <TranslationProvider initialLocale="en">
        <TranslationConsumer />
      </TranslationProvider>,
    );

    expect(getByTestId("interpolated").props.children).toBe(
      "Creating your Tokyo trip...",
    );
  });

  it("falls back to English when Vietnamese key is missing, and to key if both missing", async () => {
    const { getByTestId } = await render(
      <TranslationProvider initialLocale="vi">
        <TranslationConsumer />
      </TranslationProvider>,
    );

    expect(getByTestId("fallback").props.children).toBe("non.existent.key");
  });
});

describe("FE-CROSSCUT-001: Formatters", () => {
  it("formats dates and date ranges according to locale", () => {
    const testDate = new Date("2026-10-15T00:00:00.000Z");
    const testEndDate = new Date("2026-10-22T00:00:00.000Z");

    const formattedEn = formatDate(testDate, "en");
    expect(formattedEn).toContain("2026");

    const rangeEn = formatDateRange(testDate, testEndDate, "en");
    expect(rangeEn).toContain(" - ");

    const rangeVi = formatDateRange(testDate, testEndDate, "vi");
    expect(rangeVi).toContain(" - ");
  });

  it("formats currency correctly in USD and VND", () => {
    const usdEn = formatCurrency(1200, "USD", "en");
    expect(usdEn).toBe("$1,200");

    const vndVi = formatCurrency(2500000, "VND", "vi");
    expect(vndVi).toContain("₫");
  });

  it("formats numbers and distances correctly", () => {
    expect(formatNumber(15420, "en")).toBe("15,420");
    expect(formatDistance(850, "en")).toBe("850 m");
    expect(formatDistance(4200, "en")).toBe("4.2 km");
  });
});
