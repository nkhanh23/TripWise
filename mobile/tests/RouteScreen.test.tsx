import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import {
  generateLongMockRouteSteps,
  mockTransitRoute,
} from '../src/features/route/data/mockRoutes';
import { RoutePreviewScreen } from '../src/features/route/screens/RoutePreviewScreen';
import type { MockRouteData } from '../src/features/route/types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockComponent = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: MockComponent,
    Marker: MockComponent,
    Polyline: MockComponent,
    Callout: MockComponent,
  };
});

describe('RoutePreviewScreen', () => {
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

  it('renders route preview with map canvas, origin/destination, transport chips, summary card, and steps', async () => {
    const route: any = {
      params: {
        destinationId: 'place_wat_arun',
        destinationName: 'Wat Arun',
        originName: 'Current Location',
      },
    };

    await render(<RoutePreviewScreen navigation={mockNavigation} route={route} />);

    // Top Bar
    expect(screen.getByText('Route to Wat Arun')).toBeTruthy();

    // Origin / Destination
    expect(screen.getAllByText('Current Location').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Wat Arun').length).toBeGreaterThanOrEqual(1);

    // Transport Chips
    expect(screen.getByText('Transit')).toBeTruthy();
    expect(screen.getByText('Walk')).toBeTruthy();
    expect(screen.getByText('Drive')).toBeTruthy();
    expect(screen.getByText('Bicycle')).toBeTruthy();

    // Summary Card (Transit Default)
    expect(screen.getByText('17 min')).toBeTruthy();
    expect(screen.getByText('4.2 km')).toBeTruthy();
    expect(screen.getByText('฿45')).toBeTruthy();
    expect(screen.getByText('Fastest route via BTS Sukhumvit Line')).toBeTruthy();

    // Steps Timeline
    expect(screen.getByText('Directions (4 steps)')).toBeTruthy();
    expect(screen.getByText('Walk to BTS Asok')).toBeTruthy();
    expect(screen.getByText('BTS Sukhumvit Line (Towards Khu Khot)')).toBeTruthy();
    expect(screen.getByText('Transfer at Siam Station')).toBeTruthy();
    expect(screen.getByText('Walk to Destination')).toBeTruthy();

    // Bottom CTA
    expect(screen.getByText('Start Route')).toBeTruthy();
  });

  it('switches transport mode and updates ETA/distance/summary', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: {
        destinationId: 'place_wat_arun',
        destinationName: 'Wat Arun',
      },
    };

    await render(<RoutePreviewScreen navigation={mockNavigation} route={route} />);

    // Initially Transit
    expect(screen.getByText('17 min')).toBeTruthy();

    // Select Walk
    await user.press(screen.getByLabelText('Walk'));
    expect(screen.getByText('52 min')).toBeTruthy();
    expect(screen.getByText('4.0 km')).toBeTruthy();
    expect(screen.getByText(/Scenic pedestrian walkway/)).toBeTruthy();

    // Select Drive
    await user.press(screen.getByLabelText('Drive'));
    expect(screen.getByText('14 min')).toBeTruthy();
    expect(screen.getByText('4.8 km')).toBeTruthy();
    expect(screen.getByText(/Via Phloen Chit Rd/)).toBeTruthy();

    // Select Bicycle
    await user.press(screen.getByLabelText('Bicycle'));
    expect(screen.getByText('22 min')).toBeTruthy();
    expect(screen.getByText('4.3 km')).toBeTruthy();
  });

  it('triggers navigation.goBack when back button is pressed', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { destinationId: 'place_wat_arun' },
    };

    await render(<RoutePreviewScreen navigation={mockNavigation} route={route} />);

    await user.press(screen.getByLabelText('Back'));
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('renders large virtualized route steps list with 50 items smoothly', async () => {
    const customRouteWith50Steps: MockRouteData = {
      ...mockTransitRoute,
      steps: generateLongMockRouteSteps(50),
    };

    const route: any = {
      params: { destinationId: 'place_wat_arun' },
    };

    await render(
      <RoutePreviewScreen
        customRoute={customRouteWith50Steps}
        navigation={mockNavigation}
        route={route}
      />
    );

    expect(screen.getByText('Directions (50 steps)')).toBeTruthy();
    expect(screen.getAllByText(/Step #1/).length).toBeGreaterThanOrEqual(1);
  });

  it('handles route unavailable state and recovers when trying another transport', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { destinationId: 'place_wat_arun' },
    };

    await render(
      <RoutePreviewScreen
        initialStatus="unavailable"
        navigation={mockNavigation}
        route={route}
      />
    );

    expect(screen.getByText('Route unavailable')).toBeTruthy();
    expect(screen.getByText('Try Transit')).toBeTruthy();

    // Press Try Transit
    await user.press(screen.getByLabelText('Thử phương tiện Transit'));

    // Recovers to ready transit route
    expect(screen.queryByText('Route unavailable')).toBeNull();
    expect(screen.getByText('17 min')).toBeTruthy();
  });

  it('renders loading overlay when initialStatus is loading', async () => {
    const route: any = {
      params: { destinationId: 'place_wat_arun' },
    };

    await render(
      <RoutePreviewScreen initialStatus="loading" navigation={mockNavigation} route={route} />
    );

    expect(screen.getByLabelText('Loading…')).toBeTruthy();
  });

  it('renders error state and recovers on retry', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { destinationId: 'place_wat_arun' },
    };

    await render(
      <RoutePreviewScreen initialStatus="error" navigation={mockNavigation} route={route} />
    );

    expect(screen.getByText('Unable to calculate route')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    await user.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.queryByText('Unable to calculate route')).toBeNull();
    });
    expect(screen.getByText('17 min')).toBeTruthy();
  });
});
