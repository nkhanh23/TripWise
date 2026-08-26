import { render, waitFor, act } from "@testing-library/react-native";
import React from "react";
import { SavedPlacesScreen } from "../src/features/saved/screens/SavedPlacesScreen";
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
jest.mock("../src/features/saved/components/SavedPlaceCard", () => ({
  SavedPlaceCard: (props: any) => {
    capturedProps.push(props);
    return null;
  }
}));

describe("SavedPlacesScreen Referential Stability", () => {
  beforeEach(() => {
    capturedProps.length = 0;
  });

  it("should not change place item reference when a rating resolves", async () => {
    let mockResolve: (val: any) => void = () => {};
    const mockRatingPromise = new Promise((resolve) => {
      mockResolve = resolve;
    });

    const mockRepo = {
      listSavedPlaces: jest.fn().mockResolvedValue({
        items: [
          { id: "1", googlePlaceId: "p1", name: "Place 1", latitude: 0, longitude: 0, address: "", category: "all" }
        ],
        nextCursor: null
      })
    };
    const mockMetaRepo = {
      getMetadata: jest.fn().mockReturnValue(mockRatingPromise)
    };

    const ui = (
      <ThemeProvider>
        <TranslationProvider>
          <SavedPlacesScreen
            repository={mockRepo as any}
            metadataRepository={mockMetaRepo as any}
            fixtureMode={true}
            customPlaces={[{ id: "1", googlePlaceId: "p1", name: "Place 1", latitude: 0, longitude: 0, address: "", category: "all" } as any]}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    render(ui);

    await waitFor(() => {
      expect(capturedProps.length).toBeGreaterThan(0);
    });

    const initialProps = capturedProps[capturedProps.length - 1];
    const initialPlace = initialProps.place;

    await act(async () => {
      mockResolve({ rating: 4.5 });
    });

    await waitFor(() => {
      const finalProps = capturedProps[capturedProps.length - 1];
      expect(finalProps.rating).toBe(4.5);
    });

    const finalProps = capturedProps[capturedProps.length - 1];
    expect(finalProps.place).toBe(initialPlace); // Referential stability!
  });
});
