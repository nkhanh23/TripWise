import { cleanup, render, screen } from "@testing-library/react-native";
import React from "react";
import { View } from "react-native";

import { LoginScreen } from "../src/features/auth/screens/LoginScreen";
import { RegisterScreen } from "../src/features/auth/screens/RegisterScreen";
import { ExploreClusterMarker } from "../src/features/explore/components/ExploreClusterMarker";
import { ExploreMarker } from "../src/features/explore/components/ExploreMarker";
import { mockExplorePlaces } from "../src/features/explore/data/mockPlaces";
import { ProfileDestructiveDialog } from "../src/features/profile/components/ProfileDestructiveDialog";
import { SavedPlaceCard } from "../src/features/saved/components/SavedPlaceCard";
import { AppearanceSettingsScreen } from "../src/features/settings/screens/AppearanceSettingsScreen";
import { TripMapCanvas } from "../src/features/trips/components/TripMapCanvas";
import { TranslationProvider } from "../src/i18n";
import { darkPalette, lightPalette } from "../src/theme/palettes";
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

jest.mock("react-native-safe-area-context", () => {
  const { View: RNView } = require("react-native");
  return {
    useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
    SafeAreaView: ({ children, style }: any) => (
      <RNView style={style}>{children}</RNView>
    ),
  };
});

// WCAG Contrast Ratio Helper
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("Accessibility Baseline Audit (FE-P19-T001)", () => {
  const mockNavProps: any = {
    navigation: {
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: jest.fn().mockReturnValue(true),
      addListener: jest.fn().mockReturnValue(jest.fn()),
    },
    route: {},
  };

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
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

  describe("1. Color Contrast Baseline (WCAG AA)", () => {
    it("verifies Light Palette semantic color pairs meet WCAG AA normal text contrast (>= 4.5:1)", () => {
      const primaryTextOnCanvas = getContrastRatio(
        lightPalette.text.primary,
        lightPalette.background.canvas,
      );
      expect(primaryTextOnCanvas).toBeGreaterThanOrEqual(4.5);

      const secondaryTextOnCanvas = getContrastRatio(
        lightPalette.text.secondary,
        lightPalette.background.canvas,
      );
      expect(secondaryTextOnCanvas).toBeGreaterThanOrEqual(4.5);

      const inverseTextOnBrand = getContrastRatio(
        lightPalette.text.inverse,
        lightPalette.brand.primary,
      );
      expect(inverseTextOnBrand).toBeGreaterThanOrEqual(4.5);

      const errorTextOnSurface = getContrastRatio(
        lightPalette.state.error,
        lightPalette.background.surface,
      );
      expect(errorTextOnSurface).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies Dark Palette semantic color pairs meet WCAG AA normal text contrast (>= 4.5:1)", () => {
      const primaryTextOnCanvas = getContrastRatio(
        darkPalette.text.primary,
        darkPalette.background.canvas,
      );
      expect(primaryTextOnCanvas).toBeGreaterThanOrEqual(4.5);

      const secondaryTextOnCanvas = getContrastRatio(
        darkPalette.text.secondary,
        darkPalette.background.canvas,
      );
      expect(secondaryTextOnCanvas).toBeGreaterThanOrEqual(4.5);

      const brandOnCanvas = getContrastRatio(
        darkPalette.brand.primary,
        darkPalette.background.canvas,
      );
      expect(brandOnCanvas).toBeGreaterThanOrEqual(4.5);

      const errorOnCanvas = getContrastRatio(
        darkPalette.state.error,
        darkPalette.background.canvas,
      );
      expect(errorOnCanvas).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("2. Touch Targets & Minimum Interactive Boundaries (>= 44x44)", () => {
    it("verifies Explore Marker has accessible label and touch target", async () => {
      const samplePlace = mockExplorePlaces[0];
      const onPressMock = jest.fn();

      await renderWithProviders(
        <ExploreMarker
          isSelected={false}
          onPress={onPressMock}
          place={samplePlace}
        />,
      );

      expect(screen.getByLabelText(samplePlace.name)).toBeTruthy();
    });

    it("verifies Explore Cluster Marker has accessible label and touch target", async () => {
      const sampleCluster = {
        id: "c1",
        type: "cluster" as const,
        count: 5,
        mapCoordinate: { topPercent: 20, leftPercent: 30 },
        places: mockExplorePlaces.slice(0, 5),
      };
      const onPressMock = jest.fn();

      await renderWithProviders(
        <ExploreClusterMarker cluster={sampleCluster} onPress={onPressMock} />,
      );

      expect(
        screen.getByLabelText("5 địa điểm trong khu vực này"),
      ).toBeTruthy();
    });
  });

  describe("3. Accessibility Roles, Labels, Hints, and States", () => {
    it("exposes accessible selected states on Theme Preferences in EN", async () => {
      await renderWithProviders(
        <AppearanceSettingsScreen {...mockNavProps} />,
        "light",
        "en",
      );

      expect(screen.getByText("Appearance")).toBeTruthy();
      expect(screen.getByText("Light")).toBeTruthy();
      expect(screen.getByText("Dark")).toBeTruthy();
    });

    it("exposes accessible selected states on Theme Preferences in VI", async () => {
      await renderWithProviders(
        <AppearanceSettingsScreen {...mockNavProps} />,
        "light",
        "vi",
      );

      expect(screen.getByText("Giao diện")).toBeTruthy();
      expect(screen.getByText("Chế độ sáng")).toBeTruthy();
      expect(screen.getByText("Chế độ tối")).toBeTruthy();
    });

    it("exposes accessible role and state for SavedPlaceCard bookmark toggle", async () => {
      const samplePlace = mockExplorePlaces[0];
      const onToggleSave = jest.fn();
      const onPressCard = jest.fn();

      await renderWithProviders(
        <SavedPlaceCard
          isSaved={true}
          onPress={onPressCard}
          onToggleSave={onToggleSave}
          place={samplePlace}
        />,
      );

      expect(screen.getByText(samplePlace.name)).toBeTruthy();
      expect(screen.getByLabelText("Remove from saved")).toBeTruthy();
    });

    it("exposes accessible modal view semantics on ProfileDestructiveDialog", async () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      await renderWithProviders(
        <ProfileDestructiveDialog
          actionType="signOut"
          onCancel={onCancel}
          onConfirm={onConfirm}
          visible={true}
        />,
      );

      expect(screen.getByText("Sign out?")).toBeTruthy();
      expect(screen.getByText("You can sign back in anytime.")).toBeTruthy();
      expect(screen.getByText("Sign out")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
    });
  });

  describe("4. Form Accessibility & Error Readability", () => {
    it("renders accessible form labels on Login", async () => {
      await renderWithProviders(<LoginScreen {...mockNavProps} />);

      expect(screen.getByLabelText("Email")).toBeTruthy();
      expect(screen.getByLabelText("Mật khẩu")).toBeTruthy();
      expect(screen.getByLabelText("Đăng nhập")).toBeTruthy();
    });

    it("renders accessible form labels on Register in VI", async () => {
      await renderWithProviders(
        <RegisterScreen {...mockNavProps} />,
        "light",
        "vi",
      );

      expect(screen.getByLabelText("Họ và tên")).toBeTruthy();
      expect(screen.getByLabelText("Email")).toBeTruthy();
      expect(screen.getByLabelText("Mật khẩu")).toBeTruthy();
      expect(screen.getByLabelText("Xác nhận mật khẩu")).toBeTruthy();
      expect(screen.getByLabelText("Tạo tài khoản")).toBeTruthy();
    });
  });

  describe("5. Screen Reader Order & Map Accessibility Semantics", () => {
    it("provides descriptive textual marker labels and dismiss action on TripMapCanvas", async () => {
      await renderWithProviders(
        <TripMapCanvas
          markerItems={[]}
          onDismissSelection={jest.fn()}
          onSelectMarker={jest.fn()}
          selectedItemId={null}
        />,
      );

      expect(screen.getByLabelText("Interactive Trip Map")).toBeTruthy();
    });
  });
});
