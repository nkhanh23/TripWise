import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../src/features/home/HomeScreen';
import { mockHomeEmptyData, mockHomePopulatedData } from '../src/features/home/data/mockHome';
import { ThemeProvider } from '../src/theme';

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

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders HomeScreen populated state with upcoming trip, quick actions, drafting, and saved section', async () => {
    await render(<HomeScreen initialStatus="ready" />);

    // Top Bar
    expect(screen.getByText('TripWise')).toBeTruthy();
    expect(screen.getByLabelText('Menu')).toBeTruthy();
    expect(screen.getByLabelText('Profile')).toBeTruthy();

    // Greeting
    expect(screen.getByText('Hello, traveler')).toBeTruthy();
    expect(screen.getByText('Where are we heading next?')).toBeTruthy();

    // Hero: Upcoming Trip Card
    expect(screen.getByText('Kyoto Autumn Retreat')).toBeTruthy();
    expect(screen.getByText('In 12 Days')).toBeTruthy();
    expect(screen.getByText('Oct 14 – Oct 22')).toBeTruthy();
    expect(screen.getByText('View Itinerary')).toBeTruthy();

    // Quick Actions
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.getByText('Trips')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();

    // Drafting Card
    expect(screen.getByText('DRAFTING')).toBeTruthy();
    expect(screen.getByText('Bangkok Adventure')).toBeTruthy();
    expect(screen.getByText('Step 3 of 5')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();

    // Explore Preview
    expect(screen.getByText('Nearby Inspiration')).toBeTruthy();
    expect(screen.getByText('Discover Tokyo')).toBeTruthy();

    // Saved for Later Section
    expect(screen.getByText('Saved for Later')).toBeTruthy();
    expect(screen.getByText('View All')).toBeTruthy();
    expect(screen.getByText('Cafe Anthracite')).toBeTruthy();
    expect(screen.getByText('Seoul, South Korea')).toBeTruthy();
    expect(screen.getByText('Positano Cliffs')).toBeTruthy();
    expect(screen.getByText('Amalfi Coast, Italy')).toBeTruthy();
  });

  it('renders HomeScreen empty state (no upcoming trip)', async () => {
    const user = userEvent.setup();
    const mockCreateTrip = jest.fn();

    await render(
      <HomeScreen
        initialStatus="empty"
        onNavigateCreateTrip={mockCreateTrip}
      />
    );

    // Greeting for Empty
    expect(screen.getByText('Good morning, Traveler')).toBeTruthy();
    expect(screen.getByText('Ready for your next journey?')).toBeTruthy();

    // Empty Hero Card
    expect(screen.getByText('Plan your next adventure')).toBeTruthy();
    expect(
      screen.getByText('Create a trip to start organizing your travel plans, flights, and accommodations.')
    ).toBeTruthy();
    expect(screen.getByText('Create Trip')).toBeTruthy();

    // Quick Actions
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Explore')).toBeTruthy();

    // Inspiration
    expect(screen.getByText('Inspiration')).toBeTruthy();
    expect(screen.getByText('See all')).toBeTruthy();

    // Tap Create Trip button
    await user.press(screen.getByLabelText('Create Trip'));
    expect(mockCreateTrip).toHaveBeenCalledTimes(1);
  });

  it('renders HomeScreen loading skeleton state', async () => {
    await render(<HomeScreen initialStatus="loading" />);

    expect(screen.getByLabelText('Loading home screen')).toBeTruthy();
  });

  it('handles navigation actions from cards and quick actions', async () => {
    const user = userEvent.setup();
    const onNavigatePlanMock = jest.fn();
    const onNavigateExploreMock = jest.fn();
    const onNavigateTripsMock = jest.fn();
    const onNavigateSavedMock = jest.fn();
    const onNavigateTripDetailMock = jest.fn();
    const onNavigateCreateTripMock = jest.fn();
    const onNavigatePlaceDetailMock = jest.fn();

    await render(
      <HomeScreen
        onNavigateCreateTrip={onNavigateCreateTripMock}
        onNavigateExplore={onNavigateExploreMock}
        onNavigatePlaceDetail={onNavigatePlaceDetailMock}
        onNavigatePlan={onNavigatePlanMock}
        onNavigateSaved={onNavigateSavedMock}
        onNavigateTripDetail={onNavigateTripDetailMock}
        onNavigateTrips={onNavigateTripsMock}
      />
    );

    // Tap View Itinerary
    await user.press(screen.getByLabelText('View Itinerary: Kyoto Autumn Retreat'));
    expect(onNavigateTripDetailMock).toHaveBeenCalledWith('trip_kyoto');

    // Tap Quick Action: Plan
    await user.press(screen.getByLabelText('Plan'));
    expect(onNavigatePlanMock).toHaveBeenCalledTimes(1);

    // Tap Quick Action: Explore
    await user.press(screen.getByLabelText('Explore'));
    expect(onNavigateExploreMock).toHaveBeenCalledTimes(1);

    // Tap Quick Action: Trips
    await user.press(screen.getByLabelText('Trips'));
    expect(onNavigateTripsMock).toHaveBeenCalledTimes(1);

    // Tap Quick Action: Saved
    await user.press(screen.getByLabelText('Saved'));
    expect(onNavigateSavedMock).toHaveBeenCalledTimes(1);

    // Tap Continue drafting
    await user.press(screen.getByLabelText('Continue: Bangkok Adventure'));
    expect(onNavigateCreateTripMock).toHaveBeenCalledTimes(1);

    // Tap Saved place item
    await user.press(screen.getByLabelText('Cafe Anthracite, Seoul, South Korea'));
    expect(onNavigatePlaceDetailMock).toHaveBeenCalledWith('saved_cafe_anthracite');
  });

  it('renders correctly in Dark theme mode', async () => {
    await render(
      <ThemeProvider initialPreference="dark">
        <HomeScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Hello, traveler')).toBeTruthy();
    expect(screen.getByText('Kyoto Autumn Retreat')).toBeTruthy();
  });
});
