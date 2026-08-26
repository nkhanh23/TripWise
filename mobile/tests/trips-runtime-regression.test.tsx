import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MyTripsScreen } from "../src/features/trips/screens/MyTripsScreen";
import { TripsScreen } from "../src/features/trips/TripsScreen";
import { TripDetailScreen } from "../src/features/trips/screens/TripDetailScreen";
import { TripMapScreen } from "../src/features/trips/screens/TripMapScreen";
import { RoutePreviewScreen } from "../src/features/route/screens/RoutePreviewScreen";
import { mapSavedTripDetailToTripDetailData } from "../src/features/trips/integrationMappers";
import type { SavedTripsRepository } from "../src/integration/repositories";
import type {
  SavedTripDetail,
  SavedTripsPage,
  TripId,
} from "../src/integration/contracts";
import { TranslationProvider } from "../src/i18n";
import { ThemeProvider } from "../src/theme";
import { OsrmRouteRepository } from "../src/integration/remote/publicProviderRepositories";
import { SupabaseSavedTripsRepository } from "../src/integration/remote/supabaseTripRepositories";
import type { RootStackParamList } from "../src/navigation/types";
import { VerifiedRouteMap } from "../src/features/trips/components/VerifiedRouteMap";
import type { TripMapMarkerItem } from "../src/features/trips/types";
import type { TripSummary } from "../src/features/trips/types";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAddListener = jest.fn().mockReturnValue(jest.fn());

jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: () => true,
      addListener: mockAddListener,
    }),
  };
});

let mockMapViewRendered = false;
let mockPolylineProps: any = null;
let mockMarkerProps: any[] = [];
const mockFitToCoordinates = jest.fn();
const mockAnimateToRegion = jest.fn();

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockMapView = React.forwardRef((props: any, ref: any) => {
    mockMapViewRendered = true;
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
      fitToCoordinates: mockFitToCoordinates,
    }));
    return React.createElement(View, {
      ...props,
      testID: "verified-native-map-view",
    });
  });
  const MockMarker = (props: any) => {
    mockMarkerProps.push(props);
    return React.createElement(View, {
      ...props,
      testID: "verified-native-marker",
    });
  };
  const MockPolyline = (props: any) => {
    mockPolylineProps = props;
    return React.createElement(View, {
      ...props,
      testID: "verified-native-polyline",
    });
  };
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    Callout: (props: any) => React.createElement(View, props),
  };
});

describe("Trips & Map Production Runtime Regression Tests", () => {
  const mockNavigation: any = {
    goBack: mockGoBack,
    navigate: mockNavigate,
    canGoBack: jest.fn().mockReturnValue(true),
    addListener: mockAddListener,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMapViewRendered = false;
    mockPolylineProps = null;
    mockMarkerProps = [];
    mockAnimateToRegion.mockClear();
    mockFitToCoordinates.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  function withProviders(ui: React.ReactElement) {
    return (
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">{ui}</TranslationProvider>
      </ThemeProvider>
    );
  }

  async function renderWithProviders(ui: React.ReactElement) {
    return await render(withProviders(ui));
  }

  type TripMapRoute = NativeStackScreenProps<
    RootStackParamList,
    "TripMap"
  >["route"];

  function createTripMapRoute(
    params: RootStackParamList["TripMap"],
  ): TripMapRoute {
    return { key: "TripMap-test", name: "TripMap", params };
  }

  type TripDetailRoute = NativeStackScreenProps<
    RootStackParamList,
    "TripDetail"
  >["route"];

  function createTripDetailRoute(
    params: RootStackParamList["TripDetail"],
  ): TripDetailRoute {
    return { key: "TripDetail-test", name: "TripDetail", params };
  }

  function createVerifiedMapMarker(
    id: string,
    latitude: number,
    longitude: number,
    orderNumber: number,
  ): TripMapMarkerItem {
    return {
      item: {
        id,
        type: "place",
        time: "09:00",
        title: id,
        iconName: "place",
        resolution: "VERIFIED",
        latitude,
        longitude,
      },
      dayNumber: 1,
      orderNumber,
      coordinate: { topPercent: 0, leftPercent: 0 },
      verifiedCoordinate: { latitude, longitude },
    };
  }

  const productionTripId = "d26a5d6c-d54b-45b5-bcbd-5402bfc5a387" as TripId;

  const sampleRemoteDetail: SavedTripDetail = {
    id: productionTripId,
    title: "Bangkok Explorer",
    destination: "Bangkok, Thailand",
    startDate: "2026-08-25",
    endDate: "2026-08-26",
    estimatedBudget: null,
    currency: null,
    createdAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
    days: [
      {
        id: "11111111-1111-4111-8111-111111111111" as any,
        dayNumber: 1,
        date: "2026-08-25",
        summary: "Day 1 in Bangkok",
        items: [
          {
            id: "22222222-2222-4222-8222-222222222222" as any,
            position: 1,
            placeName: "Chùa Arun",
            resolution: "VERIFIED",
            googlePlaceId: "ChIJWatArun" as any,
            latitude: 13.7437,
            longitude: 100.4888,
            placeAddress: "Bangkok, Thailand",
            placeCategory: "temple",
            placeResolvedAt: "2026-08-21T00:00:00.000Z",
            startTime: "09:00",
            endTime: "11:00",
            note: "Visit ancient temple",
          },
          {
            id: "33333333-3333-4333-8333-333333333333" as any,
            position: 2,
            placeName: "The Grand Palace",
            resolution: "VERIFIED",
            googlePlaceId: "ChIJGrandPalace" as any,
            latitude: 13.75,
            longitude: 100.4913,
            placeAddress: "Bangkok, Thailand",
            placeCategory: "palace",
            placeResolvedAt: "2026-08-21T00:00:00.000Z",
            startTime: "13:00",
            endTime: "15:00",
            note: "Historic royal palace",
          },
        ],
      },
      {
        id: "44444444-4444-4444-8444-444444444444" as any,
        dayNumber: 2,
        date: "2026-08-26",
        summary: "Day 2 in Bangkok",
        items: [],
      },
    ],
  };

  const sampleTripSummary: TripSummary = {
    id: productionTripId,
    title: "Bangkok Explorer",
    destination: "Bangkok, Thailand",
    startDate: "2026-08-25",
    endDate: "2026-08-26",
    dateLabel: "2026-08-25 - 2026-08-26",
    status: "upcoming",
  };

  const sampleRoute = {
    profile: "driving" as const,
    distanceMeters: 2400,
    durationSeconds: 360,
    geometry: [
      { latitude: 13.7437, longitude: 100.4888 },
      { latitude: 13.75, longitude: 100.4913 },
    ],
  };

  it("1. remote empty does not show mock trips (no Nordic or Kyoto)", async () => {
    const mockRepo: SavedTripsRepository = {
      list: jest
        .fn()
        .mockResolvedValue({ items: [], nextCursor: null } as SavedTripsPage),
      getDetail: jest.fn().mockResolvedValue(null),
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };

    await renderWithProviders(<MyTripsScreen repository={mockRepo} />);

    await waitFor(() => {
      expect(mockRepo.list).toHaveBeenCalled();
    });

    // Real empty UI is shown
    expect(screen.getByText("No trips yet")).toBeTruthy();
    expect(screen.getByText("Create your first trip")).toBeTruthy();

    // MUST NOT show mock fixture trips
    expect(screen.queryByText("Nordic Lights Tour")).toBeNull();
    expect(screen.queryByText("Kyoto Autumn Retreat")).toBeNull();
    expect(screen.queryByText("Swiss Alps Hiking")).toBeNull();
  });

  it("2. remote error does not show mock trips", async () => {
    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockRejectedValue(new Error("Network error")),
      getDetail: jest.fn().mockResolvedValue(null),
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };

    await renderWithProviders(<MyTripsScreen repository={mockRepo} />);

    await waitFor(() => {
      expect(mockRepo.list).toHaveBeenCalled();
    });

    // Real error UI is shown
    expect(screen.getByText("Unable to load trips")).toBeTruthy();

    // MUST NOT fall back to mock trips
    expect(screen.queryByText("Nordic Lights Tour")).toBeNull();
    expect(screen.queryByText("Kyoto Autumn Retreat")).toBeNull();
  });

  it("3. missing detail does not fall back to mock", async () => {
    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      getDetail: jest.fn().mockResolvedValue(null),
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };

    const route: any = {
      params: { tripId: "e9999999-9999-4999-8999-999999999999" },
    };

    await renderWithProviders(
      <TripDetailScreen
        navigation={mockNavigation}
        repository={mockRepo}
        route={route}
      />,
    );

    await waitFor(() => {
      expect(mockRepo.getDetail).toHaveBeenCalled();
    });

    // Real Not Found UI is shown
    expect(screen.getByText("Trip not found")).toBeTruthy();
    expect(screen.queryByText("Bangkok Adventure")).toBeNull();
    expect(screen.queryByText("Breakfast at Ro Roast")).toBeNull();
  });

  it("4. production UUID uses remote detail in TripDetailScreen", async () => {
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      getDetail: jest.fn().mockResolvedValue(sampleRemoteDetail),
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };

    const route: any = {
      params: { tripId: productionTripId },
    };

    await renderWithProviders(
      <TripDetailScreen
        navigation={mockNavigation}
        repository={mockRepo}
        route={route}
      />,
    );

    await waitFor(() => {
      expect(mockRepo.getDetail).toHaveBeenCalledWith(
        productionTripId,
        expect.any(AbortSignal),
      );
    });

    // Wait for UI to render
    await screen.findByText("Chùa Arun");

    expect(screen.getByText("Bangkok Explorer")).toBeTruthy();
    // 1. VERIFIED item renders its text
    expect(screen.getByText("Chùa Arun")).toBeTruthy();
    expect(screen.getByText("The Grand Palace")).toBeTruthy();
    expect(screen.queryByText("Breakfast at Ro Roast")).toBeNull();
    // 2. VERIFIED item does not render Resolve place
    expect(screen.queryAllByText("Resolve place").length).toBe(0);

    // 4. Production Google Place ID is never sent into fixture-only lookup as a local fixture ID.
    // If the user taps the item body, it should NOT navigate to PlaceDetail
    const items = screen.getAllByTestId(/itinerary-item-.*/);
    expect(items.length).toBeGreaterThan(0);

    // Instead of alerting, the item should be disabled and non-interactive
    expect(items[0].props.accessibilityState?.disabled).toBe(true);

    // Still shouldn't navigate
    fireEvent.press(items[0]);
    expect(mockNavigate).not.toHaveBeenCalledWith(
      "PlaceDetail",
      expect.anything(),
    );

    // Flush any pending promises to prevent act warnings from leaking
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("4a. matching production summary renders a shell while detail loads once", async () => {
    let resolveDetail: ((detail: SavedTripDetail) => void) | undefined;
    const getDetail = jest.fn(
      () =>
        new Promise<SavedTripDetail>((resolve) => {
          resolveDetail = resolve;
        }),
    );
    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      getDetail,
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };

    await renderWithProviders(
      <TripDetailScreen
        navigation={mockNavigation}
        repository={mockRepo}
        route={createTripDetailRoute({
          tripId: productionTripId,
          tripSummary: sampleTripSummary,
        })}
      />,
    );

    await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Bangkok Explorer")).toBeTruthy();
    expect(screen.getByText("Bangkok, Thailand")).toBeTruthy();
    expect(screen.getByText("2026-08-25 - 2026-08-26")).toBeTruthy();
    expect(screen.queryByText("Chùa Arun")).toBeNull();

    await act(async () => {
      resolveDetail?.(sampleRemoteDetail);
    });
    expect(await screen.findByText("Chùa Arun")).toBeTruthy();
    expect(getDetail).toHaveBeenCalledTimes(1);
  });

  it("4b. mismatched production summary is ignored and fetches the requested detail", async () => {
    let resolveDetail: ((detail: SavedTripDetail) => void) | undefined;
    const getDetail = jest.fn(
      () =>
        new Promise<SavedTripDetail>((resolve) => {
          resolveDetail = resolve;
        }),
    );
    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      getDetail,
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };

    await renderWithProviders(
      <TripDetailScreen
        navigation={mockNavigation}
        repository={mockRepo}
        route={createTripDetailRoute({
          tripId: productionTripId,
          tripSummary: {
            ...sampleTripSummary,
            id: "99999999-9999-4999-8999-999999999999",
            destination: "Mismatched destination",
          },
        })}
      />,
    );

    await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Mismatched destination")).toBeNull();

    await act(async () => {
      resolveDetail?.(sampleRemoteDetail);
    });
    expect(await screen.findByText("Chùa Arun")).toBeTruthy();
    expect(getDetail).toHaveBeenCalledTimes(1);
  });

  it("4c. production TripDetail navigation passes its loaded trip snapshot", async () => {
    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      getDetail: jest.fn().mockResolvedValue(sampleRemoteDetail),
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };
    const route: any = { params: { tripId: productionTripId } };

    await renderWithProviders(
      <TripDetailScreen
        navigation={mockNavigation}
        repository={mockRepo}
        route={route}
      />,
    );
    await screen.findByText("Chùa Arun");

    fireEvent.press(screen.getAllByLabelText("View Map")[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      "TripMap",
      expect.objectContaining({
        tripId: productionTripId,
        initialDayId: sampleRemoteDetail.days[0].id,
        tripSnapshot: expect.objectContaining({ id: productionTripId }),
      }),
    );
  });

  it("4d. matching production snapshot skips detail fetch and starts OSRM", async () => {
    const detailSpy = jest.spyOn(
      SupabaseSavedTripsRepository.prototype,
      "getDetail",
    );
    const routeSpy = jest
      .spyOn(OsrmRouteRepository.prototype, "getRoute")
      .mockResolvedValue(sampleRoute);
    const route: any = {
      params: {
        tripId: productionTripId,
        initialDayId: sampleRemoteDetail.days[0].id,
        tripSnapshot: mapSavedTripDetailToTripDetailData(sampleRemoteDetail),
      },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    await waitFor(() => expect(routeSpy).toHaveBeenCalled());
    expect(detailSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Chùa Arun")).toBeTruthy();
    expect(mockMarkerProps.slice(-2)).toHaveLength(2);
  });

  it("4e. direct production TripMap entry fetches detail", async () => {
    const detailSpy = jest
      .spyOn(SupabaseSavedTripsRepository.prototype, "getDetail")
      .mockResolvedValue(sampleRemoteDetail);
    jest
      .spyOn(OsrmRouteRepository.prototype, "getRoute")
      .mockResolvedValue(sampleRoute);
    const route: any = {
      params: {
        tripId: productionTripId,
        initialDayId: sampleRemoteDetail.days[0].id,
      },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    await waitFor(() => {
      expect(detailSpy).toHaveBeenCalledWith(
        productionTripId,
        expect.any(AbortSignal),
      );
    });
    expect(await screen.findByText("Chùa Arun")).toBeTruthy();
  });

  it("4f. mismatched production snapshot is ignored and fetches the route trip", async () => {
    const detailSpy = jest
      .spyOn(SupabaseSavedTripsRepository.prototype, "getDetail")
      .mockResolvedValue(sampleRemoteDetail);
    jest
      .spyOn(OsrmRouteRepository.prototype, "getRoute")
      .mockResolvedValue(sampleRoute);
    const mismatchedSnapshot = {
      ...mapSavedTripDetailToTripDetailData(sampleRemoteDetail),
      id: "99999999-9999-4999-8999-999999999999",
      destination: "Mismatched destination",
    };
    const route: any = {
      params: {
        tripId: productionTripId,
        initialDayId: sampleRemoteDetail.days[0].id,
        tripSnapshot: mismatchedSnapshot,
      },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    await waitFor(() => expect(detailSpy).toHaveBeenCalled());
    expect(await screen.findByText("Bangkok Trip Map")).toBeTruthy();
    expect(screen.queryByText("Mismatched destination Trip Map")).toBeNull();
  });

  it("4g. snapshot map keeps unresolved coordinates out of markers and OSRM", async () => {
    const detailSpy = jest.spyOn(
      SupabaseSavedTripsRepository.prototype,
      "getDetail",
    );
    const routeSpy = jest
      .spyOn(OsrmRouteRepository.prototype, "getRoute")
      .mockResolvedValue(sampleRoute);
    const snapshot = mapSavedTripDetailToTripDetailData(sampleRemoteDetail);
    snapshot.days[0].items.push({
      id: "unresolved-item",
      type: "place",
      time: "16:00",
      title: "Unresolved place",
      iconName: "place",
      resolution: "UNRESOLVED",
      latitude: undefined,
      longitude: undefined,
    });
    const route: any = {
      params: {
        tripId: productionTripId,
        initialDayId: sampleRemoteDetail.days[0].id,
        tripSnapshot: snapshot,
      },
    };

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    await waitFor(() => expect(routeSpy).toHaveBeenCalled());
    expect(detailSpy).not.toHaveBeenCalled();
    expect(mockMarkerProps.slice(-2)).toHaveLength(2);
    expect(routeSpy.mock.calls[0][0].coordinates).toEqual([
      { latitude: 13.7437, longitude: 100.4888 },
      { latitude: 13.75, longitude: 100.4913 },
    ]);
  });

  it("4h. map relies on marker initialRegion until a successful OSRM route arrives", async () => {
    let resolveRoute: ((value: typeof sampleRoute) => void) | undefined;
    const pendingRoute = new Promise<typeof sampleRoute>((resolve) => {
      resolveRoute = resolve;
    });
    const routeSpy = jest
      .spyOn(OsrmRouteRepository.prototype, "getRoute")
      .mockReturnValue(pendingRoute);
    const route = createTripMapRoute({
        tripId: productionTripId,
        initialDayId: sampleRemoteDetail.days[0].id,
        tripSnapshot: mapSavedTripDetailToTripDetailData(sampleRemoteDetail),
    });

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    await waitFor(() => expect(routeSpy).toHaveBeenCalled());
    const mapProps = screen.getByTestId("verified-native-map-view").props;
    expect(mapProps.initialRegion).toMatchObject({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockFitToCoordinates).not.toHaveBeenCalled();

    await act(async () => {
      resolveRoute?.(sampleRoute);
    });
    await waitFor(() => expect(mockFitToCoordinates).toHaveBeenCalledTimes(1));
    expect(mockFitToCoordinates).toHaveBeenLastCalledWith(
      sampleRoute.geometry,
      expect.objectContaining({ animated: true }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockFitToCoordinates).toHaveBeenCalledTimes(1);
  });

  it("4i. OSRM failure leaves the marker map visible without a fit loop", async () => {
    jest
      .spyOn(OsrmRouteRepository.prototype, "getRoute")
      .mockRejectedValue(new Error("network unavailable"));
    const route = createTripMapRoute({
        tripId: productionTripId,
        initialDayId: sampleRemoteDetail.days[0].id,
        tripSnapshot: mapSavedTripDetailToTripDetailData(sampleRemoteDetail),
    });

    await renderWithProviders(
      <TripMapScreen navigation={mockNavigation} route={route} />,
    );

    expect(await screen.findByText("Chùa Arun")).toBeTruthy();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockMapViewRendered).toBe(true);
    expect(mockMarkerProps.slice(-2)).toHaveLength(2);
    expect(mockFitToCoordinates).not.toHaveBeenCalled();
  });

  it("4j. a later one-marker set deliberately updates the camera without OSRM", async () => {
    const initialMarkers = [
      createVerifiedMapMarker("day-a-1", 13.7437, 100.4888, 1),
      createVerifiedMapMarker("day-a-2", 13.75, 100.4913, 2),
    ];
    const nextMarkers = [
      createVerifiedMapMarker("day-b-1", 18.7061, 105.6304, 1),
    ];
    const onSelectMarker = jest.fn();
    const view = await renderWithProviders(
      <VerifiedRouteMap
        markers={initialMarkers}
        onSelectMarker={onSelectMarker}
        route={null}
        selectedItemId={null}
      />,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
    expect(mockFitToCoordinates).not.toHaveBeenCalled();

    await view.rerender(
      withProviders(
        <VerifiedRouteMap
          markers={nextMarkers}
          onSelectMarker={onSelectMarker}
          route={null}
          selectedItemId={null}
        />,
      ),
    );

    await waitFor(() => expect(mockAnimateToRegion).toHaveBeenCalledTimes(1));
    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      {
        latitude: 18.7061,
        longitude: 105.6304,
        latitudeDelta: 0.04,
        longitudeDelta: 0.06,
      },
      250,
    );
    expect(mockFitToCoordinates).not.toHaveBeenCalled();
  });

  it("4k. a later multi-marker set fits once without a repeated loop", async () => {
    const initialMarkers = [
      createVerifiedMapMarker("day-a-1", 13.7437, 100.4888, 1),
    ];
    const nextMarkers = [
      createVerifiedMapMarker("day-b-1", 18.7061, 105.6304, 1),
      createVerifiedMapMarker("day-b-2", 18.6796, 105.6813, 2),
    ];
    const onSelectMarker = jest.fn();
    const view = await renderWithProviders(
      <VerifiedRouteMap
        markers={initialMarkers}
        onSelectMarker={onSelectMarker}
        route={null}
        selectedItemId={null}
      />,
    );

    await view.rerender(
      withProviders(
        <VerifiedRouteMap
          markers={nextMarkers}
          onSelectMarker={onSelectMarker}
          route={null}
          selectedItemId={null}
        />,
      ),
    );

    await waitFor(() => expect(mockFitToCoordinates).toHaveBeenCalledTimes(1));
    expect(mockFitToCoordinates).toHaveBeenCalledWith(
      nextMarkers.map((marker) => marker.verifiedCoordinate),
      expect.objectContaining({ animated: true }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockFitToCoordinates).toHaveBeenCalledTimes(1);
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  it("4l. switching to no verified markers makes no invalid camera call", async () => {
    const initialMarkers = [
      createVerifiedMapMarker("day-a-1", 13.7437, 100.4888, 1),
      createVerifiedMapMarker("day-a-2", 13.75, 100.4913, 2),
    ];
    const onSelectMarker = jest.fn();
    const view = await renderWithProviders(
      <VerifiedRouteMap
        markers={initialMarkers}
        onSelectMarker={onSelectMarker}
        route={null}
        selectedItemId={null}
      />,
    );

    await view.rerender(
      withProviders(
        <VerifiedRouteMap
          markers={[]}
          onSelectMarker={onSelectMarker}
          route={null}
          selectedItemId={null}
        />,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockMapViewRendered).toBe(true);
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
    expect(mockFitToCoordinates).not.toHaveBeenCalled();
  });

  it("4m. identical marker and route geometry rerenders do not add fits", async () => {
    const initialMarkers = [
      createVerifiedMapMarker("day-a-1", 13.7437, 100.4888, 1),
      createVerifiedMapMarker("day-a-2", 13.75, 100.4913, 2),
    ];
    const onSelectMarker = jest.fn();
    const view = await renderWithProviders(
      <VerifiedRouteMap
        markers={initialMarkers}
        onSelectMarker={onSelectMarker}
        route={sampleRoute}
        selectedItemId={null}
      />,
    );

    await waitFor(() => expect(mockFitToCoordinates).toHaveBeenCalledTimes(1));
    await view.rerender(
      withProviders(
        <VerifiedRouteMap
          markers={initialMarkers.map((marker) => ({ ...marker }))}
          onSelectMarker={onSelectMarker}
          route={{ ...sampleRoute, geometry: [...sampleRoute.geometry] }}
          selectedItemId={null}
        />,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockFitToCoordinates).toHaveBeenCalledTimes(1);
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  it("4a. keeps remote detail visible and deduplicates identical focus refreshes", async () => {
    let resolveRefresh: ((detail: SavedTripDetail) => void) | undefined;
    const getDetail = jest
      .fn()
      .mockResolvedValueOnce(sampleRemoteDetail)
      .mockImplementationOnce(
        () =>
          new Promise<SavedTripDetail>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      getDetail,
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };
    const route: any = { params: { tripId: productionTripId } };

    await renderWithProviders(
      <TripDetailScreen
        navigation={mockNavigation}
        repository={mockRepo}
        route={route}
      />,
    );
    expect(await screen.findByText("Chùa Arun")).toBeTruthy();
    const focusListener = mockAddListener.mock.calls.find(
      ([event]) => event === "focus",
    )?.[1];
    expect(focusListener).toEqual(expect.any(Function));

    await act(async () => {
      focusListener();
    });
    await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Chùa Arun")).toBeTruthy();
    expect(screen.queryByLabelText("Loading…")).toBeNull();

    await act(async () => {
      focusListener();
    });
    expect(getDetail).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRefresh?.(sampleRemoteDetail);
    });
    expect(screen.getByText("Chùa Arun")).toBeTruthy();
  });

  it("4b. production UUID uses remote detail with UNRESOLVED items rendering Resolve place", async () => {
    const unresolvedRemoteDetail: SavedTripDetail = {
      ...sampleRemoteDetail,
      days: [
        {
          ...sampleRemoteDetail.days[0],
          items: [
            {
              id: "55555555-5555-4555-8555-555555555555" as any,
              position: 1,
              placeName: "Wat Arun, Bangkok, Thailand",
              resolution: "UNRESOLVED",
              latitude: null,
              longitude: null,
              startTime: "09:00",
              endTime: "11:00",
              note: undefined,
            },
          ],
        },
      ],
    };

    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      getDetail: jest.fn().mockResolvedValue(unresolvedRemoteDetail),
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };

    const route: any = {
      params: { tripId: productionTripId },
    };

    await renderWithProviders(
      <TripDetailScreen
        navigation={mockNavigation}
        repository={mockRepo}
        route={route}
      />,
    );

    await waitFor(() => {
      expect(mockRepo.getDetail).toHaveBeenCalledWith(
        productionTripId,
        expect.any(AbortSignal),
      );
    });

    // Wait for the UI to fully render the fetched data
    await screen.findByText("Wat Arun, Bangkok, Thailand");

    // 1. UNRESOLVED item renders its text
    expect(screen.getByText("Wat Arun, Bangkok, Thailand")).toBeTruthy();
    // 3. UNRESOLVED item STILL renders Resolve place
    expect(screen.getByText("Resolve place")).toBeTruthy();

    // Flush any pending promises to prevent act warnings from leaking
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("5. production Trip Map reaches VerifiedRouteMap and uses native Google Maps", async () => {
    const route: any = {
      params: {
        tripId: productionTripId,
        initialDayId: "11111111-1111-4111-8111-111111111111",
      },
    };

    const {
      mapSavedTripDetailToTripDetailData,
    } = require("../src/features/trips/integrationMappers");
    const mappedDetail = mapSavedTripDetailToTripDetailData(sampleRemoteDetail);

    await renderWithProviders(
      <TripMapScreen
        customTripDetail={mappedDetail}
        navigation={mockNavigation}
        route={route}
      />,
    );

    // Native MapView was rendered
    expect(mockMapViewRendered).toBe(true);

    // 2 VERIFIED markers are rendered
    expect(mockMarkerProps.slice(-2)).toHaveLength(2);
    expect(screen.getByText("Chùa Arun")).toBeTruthy();

    // Ensure pinColor is NEVER passed, preventing Android Fabric NullPointerException
    for (const markerProp of mockMarkerProps) {
      expect(markerProp).not.toHaveProperty("pinColor");
    }
  });

  it("6. Route Preview with trusted VERIFIED coordinates uses VerifiedRoutePreviewMap", async () => {
    jest.spyOn(OsrmRouteRepository.prototype, "getRoute").mockResolvedValue({
      profile: "driving",
      distanceMeters: 2400,
      durationSeconds: 360,
      geometry: [
        { latitude: 13.7437, longitude: 100.4888 },
        { latitude: 13.75, longitude: 100.4913 },
      ],
    });

    const route: any = {
      params: {
        destinationId: "ChIJGrandPalace",
        destinationName: "The Grand Palace",
        originName: "Chùa Arun",
        coordinates: [
          { latitude: 13.7437, longitude: 100.4888 },
          { latitude: 13.75, longitude: 100.4913 },
        ],
      },
    };

    await renderWithProviders(
      <RoutePreviewScreen navigation={mockNavigation} route={route} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Driving")).toBeTruthy();
    });

    // Verified native MapView is rendered for route preview
    expect(mockMapViewRendered).toBe(true);
    expect(screen.getByText("Route to The Grand Palace")).toBeTruthy();
    expect(screen.getByText("2.4 km • 6 min")).toBeTruthy();

    // Ensure polyline receives OSRM geometry
    expect(mockPolylineProps).toBeTruthy();
    expect(mockPolylineProps.coordinates).toHaveLength(2);
    expect(mockPolylineProps.coordinates[0]).toEqual({
      latitude: 13.7437,
      longitude: 100.4888,
    });

    // Ensure pinColor is NEVER passed, preventing Android Fabric NullPointerException
    expect(mockMarkerProps.length).toBeGreaterThan(0);
    for (const markerProp of mockMarkerProps) {
      expect(markerProp).not.toHaveProperty("pinColor");
    }
  });

  it("6b. Route Preview state lifecycle guarantees", async () => {
    let resolveRoute: (value: any) => void;
    let rejectRoute: (error: any) => void;
    const promise = new Promise((resolve, reject) => {
      resolveRoute = resolve;
      rejectRoute = reject;
    });
    promise.catch(() => {}); // prevent unhandled rejection warning

    const mockGetRoute = jest.spyOn(OsrmRouteRepository.prototype, "getRoute");
    mockGetRoute.mockImplementationOnce(() => promise as any);

    const route: any = {
      params: {
        destinationId: "ChIJGrandPalace",
        destinationName: "The Grand Palace",
        originName: "Chùa Arun",
        coordinates: [
          { latitude: 13.7437, longitude: 100.4888 },
          { latitude: 13.75, longitude: 100.4913 },
        ],
      },
    };

    const { getByLabelText, queryByText, getByText } =
      await renderWithProviders(
        <RoutePreviewScreen navigation={mockNavigation} route={route} />,
      );

    // Initial state: loading indicator is present, Route unavailable is NOT present
    expect(getByLabelText("Loading…")).toBeTruthy();
    expect(queryByText("Route unavailable")).toBeNull();

    // Wait for the request to actually begin
    await waitFor(() => {
      expect(mockGetRoute).toHaveBeenCalled();
    });

    // Resolve with a generic error first to show Retry button
    await act(async () => {
      rejectRoute!(new Error("networkError"));
    });

    await waitFor(() => {
      expect(getByText("Unable to calculate route")).toBeTruthy();
    });

    // Stale error state is cleared when new Drive request begins
    let resolveRoute2: (value: any) => void;
    let rejectRoute2: (error: any) => void;
    const promise2 = new Promise((resolve, reject) => {
      resolveRoute2 = resolve;
      rejectRoute2 = reject;
    });
    promise2.catch(() => {});
    mockGetRoute.mockImplementationOnce(() => promise2 as any);

    await act(async () => {
      fireEvent.press(getByText("Retry"));
    });

    // Wait for the second request to begin
    await waitFor(() => {
      expect(mockGetRoute).toHaveBeenCalledTimes(2);
    });

    // Goes back to loading, stale error is removed
    expect(getByLabelText("Loading…")).toBeTruthy();
    expect(queryByText("Unable to calculate route")).toBeNull();

    // Now resolve genuinely unavailable
    await act(async () => {
      rejectRoute2!(new Error("noRoute"));
    });

    await waitFor(() => {
      expect(getByText("Route unavailable")).toBeTruthy();
    });
  });

  it("7. fixture behavior only when explicitly injected for tests (fixtureMode = true)", async () => {
    await renderWithProviders(<MyTripsScreen fixtureMode={true} />);

    // Fixture mode explicitly enabled
    expect(screen.getByText("Nordic Lights Tour")).toBeTruthy();
    expect(screen.getByText("Kyoto Autumn Retreat")).toBeTruthy();
  });

  it("8. TripsScreen renders and supplies repository to MyTripsScreen by default", async () => {
    const mockRepo: SavedTripsRepository = {
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      getDetail: jest.fn().mockResolvedValue(null),
      deleteTrip: jest.fn(),
      getStats: jest
        .fn()
        .mockResolvedValue({ tripsCount: 1, savedPlacesCount: 1 }),
      updateItemNote: jest.fn().mockResolvedValue(true),
    };

    await renderWithProviders(<TripsScreen repository={mockRepo} />);

    await waitFor(() => {
      expect(mockRepo.list).toHaveBeenCalled();
    });
  });
});
