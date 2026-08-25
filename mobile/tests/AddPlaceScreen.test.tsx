import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import React from "react";

import {
  getMockTripDetail,
  resetMockTripDetail,
} from "../src/features/trips/data/mockTripDetail";
import * as tripFixtures from "../src/features/trips/data/mockTripDetail";
import { AddPlaceScreen } from "../src/features/trips/screens/AddPlaceScreen";
import { TranslationProvider } from "../src/i18n";
import { ThemeProvider } from "../src/theme";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
}));

describe("AddPlaceScreen (FE-P11-T001)", () => {
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

  it("renders header, search bar, category chips, and recommended places list", async () => {
    const route: any = {
      params: { tripId: "trip_bangkok", initialDayId: "day_1" },
    };

    await renderWithProviders(
      <AddPlaceScreen navigation={mockNavigation} route={route} />,
    );

    // Header & Search
    expect(screen.getByText("Add Place")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Search attractions, restaurants..."),
    ).toBeTruthy();

    // Categories
    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Attractions")).toBeTruthy();
    expect(screen.getByText("Restaurants")).toBeTruthy();
    expect(screen.getByText("Coffee")).toBeTruthy();

    // Recommended section header & Place cards
    expect(screen.getByText("Recommended for your trip")).toBeTruthy();
    expect(screen.getByText("Wat Arun")).toBeTruthy();
    expect(screen.getByText("The Grand Palace")).toBeTruthy();
  });

  it("filters places based on search input and supports clear action", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok" },
    };

    await renderWithProviders(
      <AddPlaceScreen navigation={mockNavigation} route={route} />,
    );

    const searchInput = screen.getByPlaceholderText(
      "Search attractions, restaurants...",
    );

    // Type "Grand Palace"
    await user.type(searchInput, "Grand Palace");

    expect(screen.getByText("Search Results")).toBeTruthy();
    expect(screen.getByText("The Grand Palace")).toBeTruthy();
    expect(screen.queryByText("Wat Arun")).toBeNull();

    // Clear search
    const clearBtn = screen.getByLabelText("Clear search");
    await user.press(clearBtn);

    expect(screen.getByText("Recommended for your trip")).toBeTruthy();
    expect(screen.getByText("Wat Arun")).toBeTruthy();
  });

  it("filters places when category chips are selected", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok" },
    };

    await renderWithProviders(
      <AddPlaceScreen navigation={mockNavigation} route={route} />,
    );

    // Tap Restaurants category
    const restaurantChip = screen.getByText("Restaurants");
    await user.press(restaurantChip);

    expect(screen.getByText("Thip Samai Pad Thai")).toBeTruthy();
    expect(screen.queryByText("Wat Arun")).toBeNull();
  });

  it("displays empty state when search returns no matches and allows resetting search", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok" },
    };

    await renderWithProviders(
      <AddPlaceScreen navigation={mockNavigation} route={route} />,
    );

    const searchInput = screen.getByPlaceholderText(
      "Search attractions, restaurants...",
    );
    await user.type(searchInput, "NonExistentPlaceQuery123");

    expect(screen.getByText("No places found")).toBeTruthy();
    expect(
      screen.getByText("Try searching for a different place or category."),
    ).toBeTruthy();

    // Tap reset button in empty state
    const resetButton = screen.getByText("Clear search");
    await user.press(resetButton);

    expect(screen.getByText("Wat Arun")).toBeTruthy();
  });

  it("opens confirmation sheet on place selection, allows editing fields, and confirms insertion", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok", initialDayId: "day_1" },
    };

    await renderWithProviders(
      <AddPlaceScreen navigation={mockNavigation} route={route} />,
    );

    // Select Wat Arun card
    const watArunCard = screen.getByLabelText(/Wat Arun/);
    await user.press(watArunCard);

    // Confirmation Sheet Header & Details
    expect(screen.getAllByText("Wat Arun").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Bangkok Yai, Bangkok").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("4.8").length).toBeGreaterThanOrEqual(1);

    // Day & Time labels
    expect(screen.getByText("Day")).toBeTruthy();
    expect(screen.getByText("Time")).toBeTruthy();
    expect(screen.getByText("Estimated duration")).toBeTruthy();

    // Select 2h duration
    const duration2h = screen.getByText("2h");
    await user.press(duration2h);

    // Add note
    const notesInput = screen.getByPlaceholderText(
      "Add details like booking refs or specific things to see...",
    );
    await user.type(notesInput, "Dress code: long pants required.");

    // Confirm addition
    const addCTA = screen.getByText("Add to itinerary");
    await user.press(addCTA);

    // Verify navigation back
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);

    // Verify local insertion into itinerary
    const updatedTrip = getMockTripDetail("trip_bangkok");
    expect(updatedTrip).not.toBeNull();
    const day1 = updatedTrip?.days.find((d) => d.id === "day_1");
    expect(day1).toBeDefined();

    const insertedItem = day1?.items.find((item) => item.title === "Wat Arun");
    expect(insertedItem).toBeDefined();
    expect(insertedItem?.durationMinutes).toBe(120);
    expect(insertedItem?.subtitle).toBe("Dress code: long pants required.");
  });

  it("handles navigation back correctly", async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: "trip_bangkok" },
    };

    await renderWithProviders(
      <AddPlaceScreen navigation={mockNavigation} route={route} />,
    );

    const backButton = screen.getByLabelText("Back");
    await user.press(backButton);

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("keeps a production UUID trip unavailable without fixture lookup or local mutation", async () => {
    const route: any = {
      params: { tripId: "1e9a8320-2222-4fcc-9999-999999999999" },
    };
    const getMockTripDetailSpy = jest.spyOn(tripFixtures, "getMockTripDetail");
    const addPlaceSpy = jest.spyOn(tripFixtures, "addPlaceToTripItinerary");

    await renderWithProviders(
      <AddPlaceScreen navigation={mockNavigation} route={route} />,
    );

    expect(getMockTripDetailSpy).not.toHaveBeenCalled();
    expect(addPlaceSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Adding places is unavailable")).toBeTruthy();
    expect(screen.queryByText("Wat Arun")).toBeNull();
    expect(screen.queryByText("Recommended for your trip")).toBeNull();
  });

  describe("Theme & Localization Matrix", () => {
    const route: any = {
      params: { tripId: "trip_bangkok" },
    };

    it("renders in Light + EN", async () => {
      await renderWithProviders(
        <AddPlaceScreen navigation={mockNavigation} route={route} />,
        "light",
        "en",
      );
      expect(screen.getByText("Add Place")).toBeTruthy();
      expect(screen.getByText("Recommended for your trip")).toBeTruthy();
    });

    it("renders in Light + VI with translated Vietnamese text", async () => {
      await renderWithProviders(
        <AddPlaceScreen navigation={mockNavigation} route={route} />,
        "light",
        "vi",
      );
      expect(screen.getByText("Thêm địa điểm")).toBeTruthy();
      expect(screen.getByText("Gợi ý cho chuyến đi")).toBeTruthy();
      expect(
        screen.getByPlaceholderText("Tìm điểm tham quan, nhà hàng..."),
      ).toBeTruthy();
    });

    it("renders in Dark + EN", async () => {
      await renderWithProviders(
        <AddPlaceScreen navigation={mockNavigation} route={route} />,
        "dark",
        "en",
      );
      expect(screen.getByText("Add Place")).toBeTruthy();
      expect(screen.getByText("Recommended for your trip")).toBeTruthy();
    });

    it("renders in Dark + VI", async () => {
      await renderWithProviders(
        <AddPlaceScreen navigation={mockNavigation} route={route} />,
        "dark",
        "vi",
      );
      expect(screen.getByText("Thêm địa điểm")).toBeTruthy();
      expect(screen.getByText("Gợi ý cho chuyến đi")).toBeTruthy();
    });
  });
});
