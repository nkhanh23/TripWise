import { render, waitFor, act } from "@testing-library/react-native";
import React from "react";
import { TripDetailScreen } from "../src/features/trips/screens/TripDetailScreen";
import { TranslationProvider } from "../src/i18n";
import { ThemeProvider } from "../src/theme";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: () => true,
    addListener: jest.fn().mockReturnValue(jest.fn()),
  }),
}));

const capturedProps: any[] = [];
jest.mock("../src/features/trips/components/ItineraryCard", () => ({
  ItineraryCard: (props: any) => {
    capturedProps.push(props);
    return null;
  }
}));

describe("TripDetailScreen Referential Stability", () => {
  beforeEach(() => {
    capturedProps.length = 0;
  });

  it("should not change itinerary item reference when an image resolves", async () => {
    let mockResolve: (val: any) => void = () => {};
    const mockImagePromise = new Promise((resolve) => {
      mockResolve = resolve;
    });

    const mockTripDetail = {
      id: "1",
      destination: "Test",
      title: "Test",
      days: [{
        dayNumber: 1,
        items: [{ id: "i1", position: 1, googlePlaceId: "valid-place-id", name: "Place 1", resolution: "VERIFIED", category: "attraction" }]
      }]
    };

    const mockRepo = {
      getDetail: jest.fn().mockResolvedValue(mockTripDetail)
    };
    const mockImageRepo = {
      getPlaceImage: jest.fn().mockReturnValue(mockImagePromise)
    };

    const ui = (
      <ThemeProvider>
        <TranslationProvider>
          <TripDetailScreen
            route={{ params: { tripId: "1" } } as any}
            navigation={{} as any}
            repository={mockRepo as any}
            placeImageRepository={mockImageRepo as any}
            weatherRepository={{ getForecast: jest.fn().mockResolvedValue(null) } as any}
            initialStatus="ready"
            customTripDetail={mockTripDetail as any}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    render(ui);

    await waitFor(() => {
      expect(capturedProps.length).toBeGreaterThan(0);
    });

    const initialProps = capturedProps[capturedProps.length - 1];
    const initialItem = initialProps.item;

    await act(async () => {
      mockResolve({ uri: "resolved-uri", width: 100, height: 100 });
    });

    await waitFor(() => {
      const finalProps = capturedProps[capturedProps.length - 1];
      expect(finalProps.resolvedImage?.uri).toBe("resolved-uri");
    });

    const finalProps = capturedProps[capturedProps.length - 1];
    expect(finalProps.item).toBe(initialItem); // Referential stability!
  });
});
