import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { generateLargeMockTripDetail } from '../src/features/trips/data/mockTripDetail';
import { TripDetailScreen } from '../src/features/trips/screens/TripDetailScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

describe('TripDetailScreen', () => {
  const mockNavigation: any = {
    goBack: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders trip hero, destination, dates, and bento summary card', async () => {
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(<TripDetailScreen navigation={mockNavigation} route={route} />);

    // Top Bar
    expect(screen.getByText('Bangkok Adventure')).toBeTruthy();
    expect(screen.getByLabelText('Back')).toBeTruthy();

    // Hero Section
    expect(screen.getByText('Bangkok, Thailand')).toBeTruthy();
    expect(screen.getByText('Oct 12 - Oct 18 • 6 Days')).toBeTruthy();

    // Bento Card
    expect(screen.getByText('Budget Status')).toBeTruthy();
    expect(screen.getByText('$1,200')).toBeTruthy();
    expect(screen.getByText('/ $1,500')).toBeTruthy();
    expect(screen.getByText('Companions')).toBeTruthy();
    expect(screen.getByText('Saved Places')).toBeTruthy();
    expect(screen.getByText('14 Locations')).toBeTruthy();
    expect(screen.getByText('View Map')).toBeTruthy();

    // Day Selector
    expect(screen.getByText('Itinerary')).toBeTruthy();
    expect(screen.getByText('Day 1 • Oct 12')).toBeTruthy();
    expect(screen.getByText('Day 2 • Oct 13')).toBeTruthy();
    expect(screen.getByText('Day 3 • Oct 14')).toBeTruthy();

    // Day 1 Itinerary Items
    expect(screen.getByText('Breakfast at Ro Roast')).toBeTruthy();
    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.getAllByText('AM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Wat Arun (Temple of Dawn)')).toBeTruthy();
    expect(screen.getByText('11:00')).toBeTruthy();
    expect(screen.getByText('Lunch at Supanniga Eating Room')).toBeTruthy();

    // FAB
    expect(screen.getByLabelText('Thêm địa điểm')).toBeTruthy();
  });

  it('switches days and updates displayed itinerary items', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(<TripDetailScreen navigation={mockNavigation} route={route} />);

    // Initially Day 1 is selected
    expect(screen.getByText('Breakfast at Ro Roast')).toBeTruthy();

    // Switch to Day 2
    await user.press(screen.getByLabelText('Day 2 • Oct 13'));

    // Day 2 items appear
    expect(screen.getByText('Factory Coffee Barista Brunch')).toBeTruthy();
    expect(screen.getByText('ICONSIAM & SookSiam Floating Market')).toBeTruthy();
    expect(screen.getByText('Dinner at Thip Samai Pad Thai')).toBeTruthy();

    // Day 1 item disappears
    expect(screen.queryByText('Breakfast at Ro Roast')).toBeNull();
  });

  it('navigates to PlaceDetail when an itinerary item with placeId is tapped', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(<TripDetailScreen navigation={mockNavigation} route={route} />);

    // Press Wat Arun card
    await user.press(screen.getByTestId('itinerary-item-item_1_2'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PlaceDetail', {
      placeId: 'place_wat_arun',
    });
  });

  it('navigates to RoutePreview when Get Directions button is pressed', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(<TripDetailScreen navigation={mockNavigation} route={route} />);

    const directionsButtons = screen.getAllByLabelText('Get Directions');
    expect(directionsButtons.length).toBeGreaterThan(0);

    await user.press(directionsButtons[0]);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('RoutePreview', {
      destinationId: 'place_wat_arun',
      destinationName: 'Wat Arun (Temple of Dawn)',
    });
  });

  it('triggers navigation goBack when back button is pressed', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(<TripDetailScreen navigation={mockNavigation} route={route} />);

    await user.press(screen.getByLabelText('Back'));

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('renders empty day state when selected day has no items', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(<TripDetailScreen navigation={mockNavigation} route={route} />);

    // Switch to Day 6 (empty day)
    await user.press(screen.getByLabelText('Day 6 • Oct 17'));

    expect(screen.getByText('No activities planned')).toBeTruthy();
    expect(
      screen.getByText('There are no scheduled activities for Day 6 • Oct 17 yet.')
    ).toBeTruthy();
    expect(screen.getByText('Explore Places')).toBeTruthy();
  });

  it('renders loading overlay when initialStatus is loading', async () => {
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(
      <TripDetailScreen initialStatus="loading" navigation={mockNavigation} route={route} />
    );

    expect(screen.getByLabelText('Loading…')).toBeTruthy();
  });

  it('renders error state and recovers on retry', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(
      <TripDetailScreen initialStatus="error" navigation={mockNavigation} route={route} />
    );

    expect(screen.getByText('Unable to load trip details')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    await user.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.queryByText('Unable to load trip details')).toBeNull();
    });
    expect(screen.getByText('Bangkok, Thailand')).toBeTruthy();
  });

  it('renders not found state for unknown trip', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: 'non_existent_trip_123' },
    };

    await render(
      <TripDetailScreen initialStatus="not_found" navigation={mockNavigation} route={route} />
    );

    expect(screen.getByText('Trip not found')).toBeTruthy();
    expect(screen.getByText('Back to Trips')).toBeTruthy();

    await user.press(screen.getByText('Back to Trips'));
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('renders large fixture with 7 days and 56 items in virtualized list', async () => {
    const user = userEvent.setup();
    const largeDetail = generateLargeMockTripDetail(7, 8);
    const route: any = {
      params: { tripId: 'trip_large_stress' },
    };

    await render(
      <TripDetailScreen
        customTripDetail={largeDetail}
        navigation={mockNavigation}
        route={route}
      />
    );

    expect(screen.getByText('Large Itinerary Scalability Test')).toBeTruthy();
    expect(screen.getByText('Day 1 • Oct 12')).toBeTruthy();
    expect(screen.getByText('Morning Matcha & Pastry #1')).toBeTruthy();

    // Switch to Day 4
    await user.press(screen.getByLabelText('Day 4 • Oct 15'));
    expect(screen.getByText('Day 4 • Oct 15')).toBeTruthy();
    expect(screen.getByText('Morning Matcha & Pastry #1')).toBeTruthy();
  });

  it('navigates to AddPlace when FAB button is pressed', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { tripId: 'trip_bangkok' },
    };

    await render(
      <TripDetailScreen
        navigation={mockNavigation}
        route={route}
      />
    );

    const fab = screen.getByLabelText('Thêm địa điểm');
    await user.press(fab);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('AddPlace', {
      tripId: 'trip_bangkok',
      initialDayId: 'day_1',
    });
  });

  it('selects first available verified place photo for hero and falls through to next candidate', async () => {
    const mockPhotoRepo: any = {
      getPhoto: jest.fn().mockImplementation(async ({ googlePlaceId }: any) => {
        if (googlePlaceId === 'place_candidate_1') {
          return { googlePlaceId, photoUri: null };
        }
        if (googlePlaceId === 'place_candidate_2') {
          return { googlePlaceId, photoUri: 'https://lh3.googleusercontent.com/places/grand_palace.jpg' };
        }
        return { googlePlaceId, photoUri: null };
      }),
    };

    const tripDetailWithVerifiedItems: any = {
      id: 'trip-test',
      title: 'Bangkok Explorer',
      destination: 'Bangkok, Thailand',
      dateLabel: 'Oct 12 - Oct 18 • 6 Days',
      startDate: '2026-10-12',
      endDate: '2026-10-18',
      durationDays: 6,
      heroImageUrl: '', // Empty initially
      budgetSpent: '$1,200',
      budgetTotal: '$1,500',
      budgetPercent: 80,
      savedPlacesCount: 2,
      travelers: [],
      days: [
        {
          id: 'day_1',
          dayNumber: 1,
          date: '2026-10-12',
          dateLabel: 'Day 1 • Oct 12',
          items: [
            {
              id: 'item_1',
              title: 'First Stop (No Photo)',
              time: '09:00',
              resolution: 'VERIFIED',
              googlePlaceId: 'place_candidate_1',
              iconName: 'restaurant',
            },
            {
              id: 'item_2',
              title: 'Grand Palace (Has Photo)',
              time: '11:00',
              resolution: 'VERIFIED',
              googlePlaceId: 'place_candidate_2',
              iconName: 'account-balance',
            },
          ],
        },
      ],
    };

    const route: any = {
      params: { tripId: 'trip-test' },
    };

    await render(
      <TripDetailScreen
        customTripDetail={tripDetailWithVerifiedItems}
        navigation={mockNavigation}
        placePhotoRepository={mockPhotoRepo}
        route={route}
      />
    );

    // Initial render works immediately without crash
    expect(screen.getByText('Bangkok, Thailand')).toBeTruthy();

    await waitFor(() => {
      expect(mockPhotoRepo.getPhoto).toHaveBeenCalledWith(
        expect.objectContaining({ googlePlaceId: 'place_candidate_1' }),
        expect.anything()
      );
      expect(mockPhotoRepo.getPhoto).toHaveBeenCalledWith(
        expect.objectContaining({ googlePlaceId: 'place_candidate_2' }),
        expect.anything()
      );
    });
  });

  it('tolerates photo provider failure without breaking Trip Detail UI', async () => {
    const mockFailingPhotoRepo: any = {
      getPhoto: jest.fn().mockRejectedValue(new Error('Network error')),
    };

    const tripDetailWithVerifiedItems: any = {
      id: 'trip-failing',
      title: 'Bangkok Explorer',
      destination: 'Bangkok, Thailand',
      dateLabel: 'Oct 12 - Oct 18 • 6 Days',
      startDate: '2026-10-12',
      endDate: '2026-10-18',
      durationDays: 6,
      heroImageUrl: '',
      budgetSpent: '$1,200',
      budgetTotal: '$1,500',
      budgetPercent: 80,
      savedPlacesCount: 1,
      travelers: [],
      days: [
        {
          id: 'day_1',
          dayNumber: 1,
          date: '2026-10-12',
          dateLabel: 'Day 1 • Oct 12',
          items: [
            {
              id: 'item_1',
              title: 'Wat Arun',
              time: '09:00',
              resolution: 'VERIFIED',
              googlePlaceId: 'place_wat_arun',
              iconName: 'account-balance',
            },
          ],
        },
      ],
    };

    const route: any = {
      params: { tripId: 'trip-failing' },
    };

    await render(
      <TripDetailScreen
        customTripDetail={tripDetailWithVerifiedItems}
        navigation={mockNavigation}
        placePhotoRepository={mockFailingPhotoRepo}
        route={route}
      />
    );

    // Header and screen render cleanly with fallback
    expect(screen.getByText('Bangkok, Thailand')).toBeTruthy();
    expect(screen.getByText('Wat Arun')).toBeTruthy();
  });

  it('renders weather forecast badge for active day when weather repository returns forecast', async () => {
    const mockWeatherRepo: any = {
      getForecast: jest.fn().mockResolvedValue({
        days: [
          {
            date: '2026-10-12',
            weatherCode: 0,
            maximumTemperatureCelsius: 33,
            minimumTemperatureCelsius: 26,
            maximumPrecipitationProbability: 10,
          },
        ],
      }),
    };

    const tripDetailWithVerifiedCoordinates: any = {
      id: 'trip-weather-test',
      title: 'Bangkok Explorer',
      destination: 'Bangkok, Thailand',
      dateLabel: 'Oct 12 - Oct 18 • 6 Days',
      startDate: '2026-10-12',
      endDate: '2026-10-18',
      durationDays: 6,
      heroImageUrl: '',
      budgetSpent: '$1,200',
      budgetTotal: '$1,500',
      budgetPercent: 80,
      savedPlacesCount: 1,
      travelers: [],
      days: [
        {
          id: 'day_1',
          dayNumber: 1,
          date: '2026-10-12',
          dateLabel: 'Day 1 • Oct 12',
          items: [
            {
              id: 'item_1',
              title: 'Wat Arun',
              time: '09:00',
              resolution: 'VERIFIED',
              googlePlaceId: 'place_wat_arun',
              latitude: 13.7437,
              longitude: 100.4888,
              iconName: 'account-balance',
            },
          ],
        },
      ],
    };

    const route: any = {
      params: { tripId: 'trip-weather-test' },
    };

    await render(
      <TripDetailScreen
        customTripDetail={tripDetailWithVerifiedCoordinates}
        navigation={mockNavigation}
        route={route}
        weatherRepository={mockWeatherRepo}
        weatherNow={() => new Date('2026-10-12T12:00:00')}
      />
    );

    expect(screen.getByText('Bangkok, Thailand')).toBeTruthy();

    await waitFor(() => {
      expect(mockWeatherRepo.getForecast).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 13.7437, longitude: 100.4888 }),
        expect.anything()
      );
      expect(screen.getByText('33° / 26°')).toBeTruthy();
      expect(screen.getByText('10%')).toBeTruthy();
    });
  });
});


