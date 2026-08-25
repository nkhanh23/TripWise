import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import React from "react";

import {
  addPlaceToTripItinerary,
  getMockTripDetail,
  resetMockTripDetail,
} from "../src/features/trips/data/mockTripDetail";
import { TripDetailScreen } from "../src/features/trips/screens/TripDetailScreen";
import { TripMapScreen } from "../src/features/trips/screens/TripMapScreen";
import { TranslationProvider } from "../src/i18n";
import { ThemeProvider } from "../src/theme";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockComponent = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: MockComponent,
    Marker: MockComponent,
    Polyline: MockComponent,
    Callout: MockComponent,
  };
});

describe("TripMapScreen (FE-P12-T001)", () => {
  const mockNavigation: any = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    addListener: jest.fn().mockReturnValue(jest.fn()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockTripDetail();
  });

  afterEach(() => {
    cleanup();
    resetMockTripDetail();
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

  it("renders trip map with header, day selector chips, numbered markers, and place preview card", async () => {
    const route: any = {
      params: { tripId: "trip_bangkok", initialDayId: "day_1" },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    // Header title
    expect(screen.getByText("Bangkok Trip Map")).toBeTruthy();

    // Day chips
    expect(screen.getByText("All Days")).toBeTruthy();
    expect(screen.getByText("Day 1")).toBeTruthy();
    expect(screen.getByText("Day 2")).toBeTruthy();

    // Numbered Markers for Day 1 (4 items)
    expect(
      screen.getByLabelText(/Selected location 1: Breakfast at Ro Roast/),
    ).toBeTruthy();
    expect(screen.getByLabelText(/Location 2: Wat Arun/)).toBeTruthy();
    expect(
      screen.getByLabelText(/Location 3: Lunch at Supanniga/),
    ).toBeTruthy();
    expect(screen.getByLabelText(/Location 4: The Grand Palace/)).toBeTruthy();

    // Bottom place preview
    expect(screen.getByText("Breakfast at Ro Roast")).toBeTruthy();
    expect(screen.getByText("09:00 AM")).toBeTruthy();
    expect(screen.getByLabelText("Directions")).toBeTruthy();
  });

  it("filters markers when switching days and renders empty state on day with no items", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok", initialDayId: "day_1" },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    // Switch to Day 2
    const day2Chip = screen.getByText("Day 2");
    await user.press(day2Chip);

    // Day 2 has 3 items
    expect(
      screen.getByLabelText(
        /Selected location 1: Factory Coffee Barista Brunch/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(/Location 2: ICONSIAM & SookSiam Floating Market/),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(/Location 3: Dinner at Thip Samai Pad Thai/),
    ).toBeTruthy();

    // Switch to Day 6 (empty in fixture)
    const day6Chip = screen.getByText("Day 6");
    await user.press(day6Chip);

    expect(screen.getByText("No places on this map")).toBeTruthy();
    expect(
      screen.getByText("Add places to your itinerary to see them on the map."),
    ).toBeTruthy();

    // Tap Add Place CTA in empty state
    const addPlaceBtn = screen.getByLabelText("Add Place");
    await user.press(addPlaceBtn);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("AddPlace", {
      tripId: "trip_bangkok",
      initialDayId: "day_6",
    });
  });

  it("switches preview card details when tapping another numbered marker", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok", initialDayId: "day_1" },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    // Tap marker 2 (Wat Arun)
    const marker2 = screen.getByLabelText(/Location 2: Wat Arun/);
    await user.press(marker2);

    // Place preview card should update to Wat Arun
    expect(screen.getByText("Wat Arun (Temple of Dawn)")).toBeTruthy();
    expect(screen.getByText("11:00 AM")).toBeTruthy();

    // Tap Directions on preview card
    const directionsBtn = screen.getByLabelText("Directions");
    await user.press(directionsBtn);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("RoutePreview", {
      destinationId: "place_wat_arun",
      destinationName: "Wat Arun (Temple of Dawn)",
    });
  });

  it("navigates to PlaceDetail when preview card body is pressed", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok", initialDayId: "day_1" },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    // Press preview card for place
    const previewCard = screen.getByLabelText(
      /Breakfast at Ro Roast, 09:00 AM/,
    );
    await user.press(previewCard);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("PlaceDetail", {
      placeId: "place_factory_coffee",
    });
  });

  it("navigates back when back button is pressed", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok" },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    const backBtn = screen.getByLabelText("Back");
    await user.press(backBtn);

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("preserves and renders newly added place from P11 AddPlace flow", async () => {
    // Add place dynamically via P11 mutator
    addPlaceToTripItinerary("trip_bangkok", "day_1", {
      id: "dynamic_item_p11",
      type: "place",
      time: "05:00",
      timePeriod: "PM",
      title: "Jim Thompson House",
      subtitle: "Silk museum in traditional Thai house",
      iconName: "museum",
      iconBgVariant: "primary",
      placeId: "place_jim_thompson",
    });

    const route: any = {
      params: { tripId: "trip_bangkok", initialDayId: "day_1" },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    // Day 1 now has 5 markers
    expect(
      screen.getByLabelText(/Location 5: Jim Thompson House/),
    ).toBeTruthy();
  });

  it("allows navigation to TripMap from TripDetail top bar and bento card", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok" },
    };

    await renderWithProviders(
      <TripDetailScreen navigation={mockNavigation} route={route} />,
    );

    // Top bar and Bento Card View Map buttons
    const viewMapButtons = screen.getAllByLabelText("View Map");
    expect(viewMapButtons.length).toBeGreaterThanOrEqual(2);

    // 1. Top bar Map button
    await user.press(viewMapButtons[0]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith("TripMap", {
      tripId: "trip_bangkok",
      initialDayId: "day_1",
    });

    // 2. Bento View Map button
    await user.press(viewMapButtons[1]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith("TripMap", {
      tripId: "trip_bangkok",
      initialDayId: "day_1",
    });
  });

  describe("Theme & Localization Matrix", () => {
    const route: any = {
      params: { tripId: "trip_bangkok", initialDayId: "day_1" },
    };

    it("renders in Light + EN", async () => {
      await renderWithProviders(
        <TripMapScreen navigation={mockNavigation} route={route} />,
        "light",
        "en",
      );
      expect(screen.getByText("Bangkok Trip Map")).toBeTruthy();
      expect(screen.getByText("All Days")).toBeTruthy();
      expect(screen.getByText("Day 1")).toBeTruthy();
    });

    it("renders in Light + VI with translated Vietnamese text", async () => {
      await renderWithProviders(
        <TripMapScreen navigation={mockNavigation} route={route} />,
        "light",
        "vi",
      );
      expect(screen.getByText("Bangkok Bản đồ chuyến đi")).toBeTruthy();
      expect(screen.getByText("Tất cả các ngày")).toBeTruthy();
      expect(screen.getByText("Ngày 1")).toBeTruthy();
      expect(screen.getByLabelText("Chỉ đường")).toBeTruthy();
    });

    it("renders in Dark + EN", async () => {
      await renderWithProviders(
        <TripMapScreen navigation={mockNavigation} route={route} />,
        "dark",
        "en",
      );
      expect(screen.getByText("Bangkok Trip Map")).toBeTruthy();
      expect(screen.getByText("All Days")).toBeTruthy();
    });

    it("renders in Dark + VI", async () => {
      await renderWithProviders(
        <TripMapScreen navigation={mockNavigation} route={route} />,
        "dark",
        "vi",
      );
      expect(screen.getByText("Bangkok Bản đồ chuyến đi")).toBeTruthy();
      expect(screen.getByText("Tất cả các ngày")).toBeTruthy();
    });
  });
});
