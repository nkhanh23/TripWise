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
    expect(screen.getByLabelText('Quay lại')).toBeTruthy();

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
    await user.press(screen.getByLabelText(/Wat Arun \(Temple of Dawn\)/));

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

    await user.press(screen.getByLabelText('Quay lại'));

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

    expect(screen.getByLabelText('Đang tải chi tiết chuyến đi')).toBeTruthy();
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

    await user.press(screen.getByLabelText('Thử lại'));

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

    await user.press(screen.getByLabelText('Quay lại danh sách chuyến đi'));
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
});
