import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import {
  generateLargeMockTrips,
  mockPastTrips,
  mockUpcomingTrips,
} from '../src/features/trips/data/mockTrips';
import { MyTripsScreen } from '../src/features/trips/screens/MyTripsScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

describe('MyTripsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders MyTripsScreen with top bar, headings, upcoming/past sections, and FAB', async () => {
    await render(<MyTripsScreen />);

    // Top Bar
    expect(screen.getByText('TripWise')).toBeTruthy();
    expect(screen.getByLabelText('Menu')).toBeTruthy();
    expect(screen.getByLabelText('Tìm kiếm')).toBeTruthy();

    // Screen Headings
    expect(screen.getByText('My Trips')).toBeTruthy();
    expect(
      screen.getByText('Manage your upcoming journeys and review past adventures.')
    ).toBeTruthy();

    // Section Headings
    expect(screen.getByText('Upcoming')).toBeTruthy();
    expect(screen.getByText('Past Trips')).toBeTruthy();

    // Upcoming Trip Cards
    expect(screen.getByText('Kyoto Autumn Retreat')).toBeTruthy();
    expect(screen.getByText('In 12 Days')).toBeTruthy();
    expect(screen.getByText('Oct 14 - Oct 22')).toBeTruthy();
    expect(screen.getByText('Kyoto, Japan')).toBeTruthy();
    expect(screen.getAllByText('JS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('MK')).toBeTruthy();

    expect(screen.getByText('Nordic Lights Tour')).toBeTruthy();
    expect(screen.getByText('Planning')).toBeTruthy();
    expect(screen.getByText('Dec 05 - Dec 15')).toBeTruthy();
    expect(screen.getByText('Tromsø, Norway')).toBeTruthy();

    // Past Trip Cards
    expect(screen.getByText('Swiss Alps Hiking')).toBeTruthy();
    expect(screen.getByText('Aug 2023')).toBeTruthy();
    expect(screen.getByText('Rome Weekend')).toBeTruthy();
    expect(screen.getByText('NYC Business')).toBeTruthy();

    // FAB
    expect(screen.getByText('Create Trip')).toBeTruthy();
    expect(screen.getByLabelText('Tạo chuyến đi')).toBeTruthy();
  });

  it('handles trip card selection and navigates with tripId', async () => {
    const user = userEvent.setup();
    const onSelectTripMock = jest.fn();

    await render(<MyTripsScreen onSelectTrip={onSelectTripMock} />);

    await user.press(
      screen.getByLabelText('Kyoto Autumn Retreat, Kyoto, Japan, Oct 14 - Oct 22')
    );

    expect(onSelectTripMock).toHaveBeenCalledWith('trip_kyoto');
  });

  it('handles past trip card selection', async () => {
    const user = userEvent.setup();
    const onSelectTripMock = jest.fn();

    await render(<MyTripsScreen onSelectTrip={onSelectTripMock} />);

    await user.press(screen.getByLabelText('Swiss Alps Hiking, Aug 2023'));

    expect(onSelectTripMock).toHaveBeenCalledWith('trip_swiss');
  });

  it('triggers create trip when FAB is pressed', async () => {
    const user = userEvent.setup();
    const onCreateTripMock = jest.fn();

    await render(<MyTripsScreen onCreateTrip={onCreateTripMock} />);

    await user.press(screen.getByLabelText('Tạo chuyến đi'));

    expect(onCreateTripMock).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when there are no trips', async () => {
    const user = userEvent.setup();
    const onCreateTripMock = jest.fn();

    const emptySections = [
      {
        type: 'upcoming' as const,
        title: 'Upcoming',
        iconName: 'flight-takeoff' as const,
        iconColor: '#0058BC',
        data: [],
      },
      {
        type: 'past' as const,
        title: 'Past Trips',
        iconName: 'history' as const,
        iconColor: '#54606B',
        data: [],
      },
    ];

    await render(
      <MyTripsScreen
        customSections={emptySections}
        onCreateTrip={onCreateTripMock}
      />
    );

    expect(screen.getByText('No trips yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Plan your next journey or explore exciting destinations to start your adventure.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Create your first trip')).toBeTruthy();

    await user.press(screen.getByLabelText('Tạo chuyến đi đầu tiên'));
    expect(onCreateTripMock).toHaveBeenCalledTimes(1);
  });

  it('renders large fixture with >= 20 trips in virtualized SectionList', async () => {
    const largeSections = generateLargeMockTrips(24);

    await render(<MyTripsScreen customSections={largeSections} />);

    expect(screen.getByText('My Trips')).toBeTruthy();
    expect(screen.getByText('Tokyo Exploration #1')).toBeTruthy();
  });

  it('renders loading progress bar when initialStatus is loading', async () => {
    await render(<MyTripsScreen initialStatus="loading" />);

    expect(screen.getByLabelText('Đang tải danh sách chuyến đi')).toBeTruthy();
  });

  it('renders error alert and recovers on retry', async () => {
    const user = userEvent.setup();

    await render(<MyTripsScreen initialStatus="error" />);

    expect(screen.getByText('Unable to load trips')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    await user.press(screen.getByLabelText('Thử lại'));

    await waitFor(() => {
      expect(screen.queryByText('Unable to load trips')).toBeNull();
    });
    expect(screen.getByText('Kyoto Autumn Retreat')).toBeTruthy();
  });
});
