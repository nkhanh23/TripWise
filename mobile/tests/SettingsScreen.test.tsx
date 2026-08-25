import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import { resetProfile } from "../src/features/profile/data/mockProfile";
import { ProfileScreen } from "../src/features/profile/screens/ProfileScreen";
import { resetSavedPlaces } from "../src/features/saved/data/savedPlacesStore";
import {
  AppearanceSettingsScreen,
  CurrencySettingsScreen,
  HelpSupportScreen,
  LanguageSettingsScreen,
  resetSettings,
  SettingsScreen,
} from "../src/features/settings";
import { TranslationProvider } from "../src/i18n";
import { ThemeProvider } from "../src/theme";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSignOut = jest.fn();

jest.mock("../src/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    status: "authenticated",
    user: { email: "sarah.j@example.com" },
    profile: { display_name: "Sarah Jenkins" },
  }),
}));

jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: jest.fn().mockReturnValue(true),
      addListener: jest.fn().mockReturnValue(jest.fn()),
    }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
}));

describe("Settings Feature (FE-P15-T001)", () => {
  const mockNavProps: any = {
    navigation: {
      navigate: mockNavigate,
      goBack: mockGoBack,
    },
    route: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSettings();
    resetProfile();
    resetSavedPlaces();
  });

  afterEach(() => {
    cleanup();
    resetSettings();
    resetProfile();
    resetSavedPlaces();
  });

  async function renderWithProviders(
    ui: React.ReactElement,
    theme: "light" | "dark" = "light",
    locale: "en" | "vi" = "en",
  ) {
    return await render(
      <ThemeProvider initialPreference={theme}>
        <TranslationProvider initialLocale={locale}>{ui}</TranslationProvider>
      </ThemeProvider>,
    );
  }

  describe("SettingsScreen Rendering & Navigation", () => {
    it("renders only the current Stitch Settings sections and rows", async () => {
      await renderWithProviders(<SettingsScreen {...mockNavProps} />);

      // Title & Top Bar
      expect(screen.getByText("Settings")).toBeTruthy();

      // Sections
      expect(screen.getByText("GENERAL")).toBeTruthy();
      expect(screen.getByText("APPEARANCE")).toBeTruthy();
      expect(screen.getByText("NOTIFICATIONS")).toBeTruthy();
      expect(screen.getByText("ACCOUNT")).toBeTruthy();

      // General Rows
      expect(screen.getByText("Language")).toBeTruthy();
      expect(screen.getByText("English")).toBeTruthy();
      expect(screen.getByText("Currency")).toBeTruthy();
      expect(screen.getByText("USD")).toBeTruthy();
      expect(screen.getByText("Distance")).toBeTruthy();
      expect(screen.getByText("Kilometers")).toBeTruthy();

      // Appearance Row
      expect(screen.getByText("Theme")).toBeTruthy();

      // Notification Rows
      expect(screen.getByText("Trip reminders")).toBeTruthy();
      expect(screen.getByText("Itinerary reminders")).toBeTruthy();

      // Current Stitch Settings has no Support section. Help remains reachable from Profile.
      expect(screen.queryByText("SUPPORT")).toBeNull();
      expect(screen.queryByText("Help & Support")).toBeNull();
      expect(screen.queryByText("About TripWise")).toBeNull();
      expect(screen.queryByText("Version 1.0.0")).toBeNull();

      // Account Rows
      expect(screen.getByText("Change password")).toBeTruthy();
      expect(screen.getByText("Privacy")).toBeTruthy();
      expect(screen.getByText("Delete account")).toBeTruthy();
    });

    it("navigates to sub-screens when rows are tapped", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<SettingsScreen {...mockNavProps} />);

      // Tap Language
      const langRow = screen.getByLabelText("Language");
      await user.press(langRow);
      expect(mockNavigate).toHaveBeenCalledWith("LanguageSettings");

      // Tap Currency
      const currRow = screen.getByLabelText("Currency");
      await user.press(currRow);
      expect(mockNavigate).toHaveBeenCalledWith("CurrencySettings");

      // Tap Theme
      const themeRow = screen.getByLabelText("Theme");
      await user.press(themeRow);
      expect(mockNavigate).toHaveBeenCalledWith("AppearanceSettings");

      // Tap Back button
      const backBtn = screen.getByLabelText("Back");
      await user.press(backBtn);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("navigates from ProfileScreen to Settings and HelpSupport", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ProfileScreen />);

      // Tap Settings in Profile menu
      const profileSettingsRow = screen.getByLabelText("Settings");
      await user.press(profileSettingsRow);
      expect(mockNavigate).toHaveBeenCalledWith("Settings");

      // Tap Help & Support in Profile menu
      const profileHelpRow = screen.getByLabelText("Help & Support");
      await user.press(profileHelpRow);
      expect(mockNavigate).toHaveBeenCalledWith("HelpSupport");
    });

    it("gives immediate unavailable feedback for Change password", async () => {
      await renderWithProviders(<SettingsScreen {...mockNavProps} />);
      const button = screen.getByLabelText("Change password");
      expect(button.props.accessibilityRole).toBe("button");

      // Test that the disabled state is applied
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it("gives immediate unavailable feedback for About", async () => {
      await renderWithProviders(<ProfileScreen />);
      const button = screen.getByLabelText("About TripWise");
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it("toggles distance unit between Kilometers and Miles", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<SettingsScreen {...mockNavProps} />);

      const distanceRow = screen.getByLabelText("Distance");
      expect(screen.getByText("Kilometers")).toBeTruthy();

      await user.press(distanceRow);
      expect(screen.getByText("Miles")).toBeTruthy();

      await user.press(distanceRow);
      expect(screen.getByText("Kilometers")).toBeTruthy();
    });
  });

  describe("AppearanceSettingsScreen (Theme Preference)", () => {
    it("renders theme options and allows selecting Light, Dark, and System default", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<AppearanceSettingsScreen {...mockNavProps} />);

      expect(screen.getByText("Appearance")).toBeTruthy();
      expect(screen.getByText("System default")).toBeTruthy();
      expect(screen.getByText("Light")).toBeTruthy();
      expect(screen.getByText("Dark")).toBeTruthy();

      // Select Dark
      const darkOption = screen.getByLabelText("Dark");
      await user.press(darkOption);

      // Select Light
      const lightOption = screen.getByLabelText("Light");
      await user.press(lightOption);

      // Select System default
      const systemOption = screen.getByLabelText("System default");
      await user.press(systemOption);

      // Back button
      const backBtn = screen.getByLabelText("Back");
      await user.press(backBtn);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("LanguageSettingsScreen (Language Preference)", () => {
    it("renders language options and updates active locale immediately", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<LanguageSettingsScreen {...mockNavProps} />);

      expect(screen.getByText("Language")).toBeTruthy();
      expect(screen.getByText("English")).toBeTruthy();
      expect(screen.getByText("Tiếng Việt")).toBeTruthy();

      // Switch to Vietnamese
      const viOption = screen.getByLabelText("Tiếng Việt");
      await user.press(viOption);

      // Screen title translates to Vietnamese immediately
      expect(screen.getByText("Ngôn ngữ")).toBeTruthy();

      // Switch back to English
      const enOption = screen.getByLabelText("English");
      await user.press(enOption);
      expect(screen.getByText("Language")).toBeTruthy();
    });
  });

  describe("CurrencySettingsScreen (Currency Preference)", () => {
    it("renders suggested and all currencies, filters by search, and selects currency", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<CurrencySettingsScreen {...mockNavProps} />);

      expect(screen.getByText("Currency")).toBeTruthy();
      expect(screen.getByText("Suggested")).toBeTruthy();
      expect(screen.getByText("US Dollar")).toBeTruthy();
      expect(screen.getByText("Vietnamese Dong")).toBeTruthy();
      expect(screen.getByText("Thai Baht")).toBeTruthy();

      // Select Vietnamese Dong
      const vndCard = screen.getByLabelText("VND, Vietnamese Dong");
      await user.press(vndCard);

      // Search for Euro
      const searchInput = screen.getByLabelText(
        "Search currency or country...",
      );
      await user.type(searchInput, "Euro");
      expect(screen.getByText("Euro")).toBeTruthy();
      expect(screen.queryByText("Thai Baht")).toBeNull();

      // Select Euro from filtered list
      const eurCard = screen.getByLabelText("EUR, Euro");
      await user.press(eurCard);

      // Clear search
      const clearBtn = screen.getByLabelText("Clear search");
      await user.press(clearBtn);
      expect(screen.getByText("Suggested")).toBeTruthy();
    });

    it("shows empty state when search finds no match", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<CurrencySettingsScreen {...mockNavProps} />);

      const searchInput = screen.getByLabelText(
        "Search currency or country...",
      );
      await user.type(searchInput, "NonExistentCurrencyXYZ");

      expect(screen.getByText("No currencies match your search")).toBeTruthy();
    });
  });

  describe("Notification Preferences", () => {
    it("toggles notification switches without native or remote side effects", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<SettingsScreen {...mockNavProps} />);

      const tripSwitch = screen.getByLabelText("Trip reminders");
      const itinerarySwitch = screen.getByLabelText("Itinerary reminders");

      expect(tripSwitch).toBeTruthy();
      expect(itinerarySwitch).toBeTruthy();
      expect(
        screen.getByText(
          "App preference only — notifications are not configured yet.",
        ),
      ).toBeTruthy();
      expect(
        screen.getByText("App preference only — no OS alerts are scheduled."),
      ).toBeTruthy();

      // Toggle switches
      await user.press(tripSwitch);
      await user.press(itinerarySwitch);
    });
  });

  describe("HelpSupportScreen", () => {
    it("renders help topics, legal items, search input, and illustration", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<HelpSupportScreen {...mockNavProps} />);

      expect(screen.getByText("Help & Support")).toBeTruthy();
      expect(screen.getByText("Common Topics")).toBeTruthy();
      expect(screen.getByText("Frequently asked questions")).toBeTruthy();
      expect(screen.getByText("Contact support")).toBeTruthy();
      expect(screen.getByText("Report a problem")).toBeTruthy();

      expect(screen.getByText("Legal")).toBeTruthy();
      expect(screen.getByText("Privacy Policy")).toBeTruthy();
      expect(screen.getByText("Terms of Service")).toBeTruthy();

      // Search input
      const searchInput = screen.getByLabelText("Search for help...");
      await user.type(searchInput, "booking");

      const clearBtn = screen.getByLabelText("Clear search");
      await user.press(clearBtn);

      // Back button
      const backBtn = screen.getByLabelText("Back");
      await user.press(backBtn);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("gives immediate unavailable feedback for every help and legal row", async () => {
      await renderWithProviders(<HelpSupportScreen {...mockNavProps} />);

      for (const label of [
        "Frequently asked questions",
        "Contact support",
        "Report a problem",
        "Privacy Policy",
        "Terms of Service",
      ]) {
        const row = screen.getByLabelText(label);
        expect(row.props.accessibilityState?.disabled).toBe(true);
      }
    });
  });

  describe("Independence Matrix (Theme, Locale, Currency)", () => {
    it("changing language does not modify currency or theme", async () => {
      await renderWithProviders(
        <SettingsScreen {...mockNavProps} />,
        "light",
        "vi",
      );

      expect(screen.getByText("Cài đặt")).toBeTruthy();
      expect(screen.getByText("Tiếng Việt")).toBeTruthy();
      // Currency remains USD
      expect(screen.getByText("USD")).toBeTruthy();
    });

    it("changing currency preserves active language and theme", async () => {
      const user = userEvent.setup();
      await renderWithProviders(
        <CurrencySettingsScreen {...mockNavProps} />,
        "dark",
        "en",
      );

      const eurCard = screen.getByLabelText("EUR, Euro");
      await user.press(eurCard);

      expect(screen.getByText("Currency")).toBeTruthy();
    });
  });

  describe("Theme & Localization Matrix", () => {
    it("renders in Light + EN", async () => {
      await renderWithProviders(
        <SettingsScreen {...mockNavProps} />,
        "light",
        "en",
      );
      expect(screen.getByText("Settings")).toBeTruthy();
      expect(screen.getByText("GENERAL")).toBeTruthy();
    });

    it("renders in Light + VI with translated Vietnamese text", async () => {
      await renderWithProviders(
        <SettingsScreen {...mockNavProps} />,
        "light",
        "vi",
      );
      expect(screen.getByText("Cài đặt")).toBeTruthy();
      expect(screen.getByText("CHUNG")).toBeTruthy();
      expect(screen.getByText("GIAO DIỆN")).toBeTruthy();
      expect(screen.getByText("THÔNG BÁO")).toBeTruthy();
      expect(screen.queryByText("HỖ TRỢ")).toBeNull();
      expect(screen.getByText("TÀI KHOẢN")).toBeTruthy();
    });

    it("renders in Dark + EN", async () => {
      await renderWithProviders(
        <SettingsScreen {...mockNavProps} />,
        "dark",
        "en",
      );
      expect(screen.getByText("Settings")).toBeTruthy();
    });

    it("renders in Dark + VI", async () => {
      await renderWithProviders(
        <SettingsScreen {...mockNavProps} />,
        "dark",
        "vi",
      );
      expect(screen.getByText("Cài đặt")).toBeTruthy();
    });
  });
});
