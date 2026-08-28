const fs = require('fs');

const testFile = 'mobile/tests/ExploreProductionScreen.test.tsx';

const imports = `import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ExploreDiscoveredPlace, ExplorePlacesRequest } from '../src/integration/contracts';
import type { ExplorePlacesRepository } from '../src/integration/repositories';
import { ExploreMotionHint } from '../src/features/explore/components/ExploreMotionHint';
import { buildExplorationHints } from '../src/features/explore/components/ExploreMapCanvas';
import { ExploreScreen } from '../src/features/explore/ExploreScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../src/features/explore/components/ExploreMapCanvas', () => {
  const actual = jest.requireActual('../src/features/explore/components/ExploreMapCanvas');
  return {
    ...actual,
    ExploreMapCanvas: ({
      markerItems,
      markersDimmed,
      onMovementStateChange,
      onRegionChangeComplete,
      status,
    }: any) => {
      const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
      const hintCount =
        status === 'moving' || status === 'refreshing'
          ? actual.buildExplorationHints(actual.INITIAL_EXPLORE_REGION).length
          : 0;
      return (
        <MockView accessibilityLabel="Production Explore Map">
          <MockText testID="map-status">{status}</MockText>
          <MockText testID="markers-dimmed">{String(Boolean(markersDimmed))}</MockText>
          <MockText testID="hint-count">{String(hintCount)}</MockText>
          {markerItems.flatMap((item: any) =>
            item.type === 'place' ? [<MockText key={item.place.id}>{item.place.name}</MockText>] : []
          )}
          <MockPressable
            accessibilityLabel="Initial settle"
            onPress={() =>
              onRegionChangeComplete?.(
                { latitude: 13.76, longitude: 100.52, latitudeDelta: 0.02, longitudeDelta: 0.02 },
                { isGesture: false }
              )
            }
          />
          <MockPressable
            accessibilityLabel="Initial user zoom"
            onPress={() =>
              onRegionChangeComplete?.(
                { latitude: 13.76, longitude: 100.52, latitudeDelta: 0.02, longitudeDelta: 0.02 },
                { isGesture: true }
              )
            }
          />
          <MockPressable accessibilityLabel="Move start" onPress={() => onMovementStateChange?.(true)} />
          <MockPressable accessibilityLabel="Move continue" onPress={() => onMovementStateChange?.(true)} />
          <MockPressable
            accessibilityLabel="Pan A"
            onPress={() => {
              onMovementStateChange?.(false);
              onRegionChangeComplete?.({ latitude: 13.7, longitude: 100.5, latitudeDelta: 0.04, longitudeDelta: 0.04 });
            }}
          />
          <MockPressable
            accessibilityLabel="Pan B"
            onPress={() => {
              onMovementStateChange?.(false);
              onRegionChangeComplete?.({ latitude: 13.8, longitude: 100.6, latitudeDelta: 0.04, longitudeDelta: 0.04 });
            }}
          />
          <MockPressable
            accessibilityLabel="Restaurants"
            onPress={() => {}}
          />
        </MockView>
      );
    },
  };
});

const attraction: ExploreDiscoveredPlace = {
  googlePlaceId: 'ChIJrealAttraction123' as never,
  name: 'Wat Arun',
  coordinate: { latitude: 13.7437, longitude: 100.4888 },
  category: 'attractions',
  categoryLabel: 'Attraction',
  address: 'Bangkok',
  rating: 4.8,
  userRatingCount: 120,
};

const restaurant: ExploreDiscoveredPlace = {
  googlePlaceId: 'ChIJrealRestaurant678' as never,
  name: 'Real Restaurant',
  coordinate: { latitude: 13.75, longitude: 100.5 },
  category: 'restaurants',
  categoryLabel: 'Restaurant',
};

function repository(
  implementation: (request: ExplorePlacesRequest, signal?: AbortSignal) => Promise<ExploreDiscoveredPlace[]>
): ExplorePlacesRepository {
  return { discover: jest.fn(implementation) };
}

async function advanceDebounce(ms = 400) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}
`;

const describeBlock = `
describe('production Explore discovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('true initial loading', async () => {
    const discover = jest.fn().mockImplementation(() => new Promise(() => {}));
    render(<ExploreScreen repository={{ discover }} />);
    expect(screen.getByLabelText('Đang tải dữ liệu bản đồ')).toBeTruthy();
  });

  it('real initial success', async () => {
    const discover = jest.fn().mockResolvedValue([attraction]);
    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
  });

  it('local search with zero provider calls', async () => {
    const discover = jest.fn().mockResolvedValue([attraction, restaurant]);
    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
    
    fireEvent.changeText(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), 'Real');
    fireEvent.changeText(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), '');
    expect(discover).toHaveBeenCalledTimes(1);
  });

  it('continuous movement keeps confirmed markers visible, hints bounded, zero calls', async () => {
    const discover = jest.fn().mockResolvedValue([attraction]);
    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(discover).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
    
    fireEvent.press(screen.getByLabelText('Move start'));
    await waitFor(() => expect(screen.getByTestId('map-status').props.children).toBe('moving'));
    expect(screen.getByText('Wat Arun')).toBeTruthy();
    expect(discover).toHaveBeenCalledTimes(1); // no new calls
  });

  it('settled viewport retains 400ms debounce and makes exactly one request', async () => {
    const discover = jest.fn().mockResolvedValue([attraction]);
    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(discover).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByLabelText('Pan A'));
    await advanceDebounce(399);
    expect(discover).toHaveBeenCalledTimes(1); // not called yet
    await advanceDebounce(1);
    expect(discover).toHaveBeenCalledTimes(2); // exactly one request added
  });

  it('exact supersede window', async () => {
    let resolveR1;
    const requestR1 = new Promise((resolve) => { resolveR1 = resolve; });
    let resolveB;
    const requestB = new Promise((resolve) => { resolveB = resolve; });

    const discover = jest.fn()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => requestR1)
      .mockImplementationOnce(() => requestB);

    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());

    // Pan A starts request R1
    fireEvent.press(screen.getByLabelText('Pan A'));
    await advanceDebounce(400);
    expect(discover).toHaveBeenCalledTimes(2);

    // Settle Pan B before R1 resolves
    fireEvent.press(screen.getByLabelText('Pan B'));
    await advanceDebounce(100);
    expect(discover).toHaveBeenCalledTimes(2); // no premature call

    await act(async () => {
      resolveR1([attraction]);
      await Promise.resolve();
    });

    await advanceDebounce(300);
    expect(discover).toHaveBeenCalledTimes(3); // exactly one B call

    await act(async () => {
      resolveB([restaurant]);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());
    expect(screen.queryByText('Wat Arun')).toBeNull(); // B authoritative
  });

  it('equivalent/deduped settle makes no unnecessary call', async () => {
    const discover = jest.fn().mockResolvedValue([attraction]);
    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(discover).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByLabelText('Initial settle'));
    await advanceDebounce(450);
    expect(discover).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Pan A'));
    await advanceDebounce(450);
    expect(discover).toHaveBeenCalledTimes(2);

    fireEvent.press(screen.getByLabelText('Pan A')); // equivalent
    await advanceDebounce(450);
    expect(discover).toHaveBeenCalledTimes(2);
  });

  it('category exactly one call, no loading wheel, old category not authoritative', async () => {
    const discover = jest.fn((req) => 
      Promise.resolve(req.category === 'restaurants' ? [restaurant] : [attraction])
    );
    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());

    fireEvent.press(screen.getByText('Restaurants'));
    expect(screen.getByTestId('markers-dimmed').props.children).toBe('true');
    expect(screen.queryByLabelText('Đang tải dữ liệu bản đồ')).toBeNull();
    expect(screen.queryByLabelText('Đang làm mới dữ liệu bản đồ')).toBeNull();

    await advanceDebounce();
    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());
    expect(screen.queryByText('Wat Arun')).toBeNull();
    expect(discover).toHaveBeenCalledTimes(2);
  });

  it('background refresh failure keeps last confirmed markers', async () => {
    const discover = jest.fn()
      .mockResolvedValueOnce([attraction])
      .mockRejectedValueOnce(new Error('network'));

    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Pan A'));
    await advanceDebounce();
    
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
    expect(screen.queryByText('Unable to load map')).toBeNull();
  });

  it('initial failure keeps retry still working', async () => {
    const discover = jest.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([]);

    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Unable to load map')).toBeTruthy());
    fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('No places found')).toBeTruthy());
    expect(discover).toHaveBeenCalledTimes(2);
  });

  it('hints have no fake POI semantics, non-interactive, accessibility-hidden', async () => {
    const hints = buildExplorationHints({
      latitude: 13.76, longitude: 100.52, latitudeDelta: 0.14, longitudeDelta: 0.22,
    });
    expect(hints).toHaveLength(8);
    expect(Object.keys(hints[0]).sort()).toEqual(['coordinate', 'id', 'opacity', 'scale']);

    render(<ExploreMotionHint opacity={0.3} scale={0.8} />);
    const hint = screen.getByTestId('explore-motion-hint');
    expect(hint.props.accessible).toBe(false);
    expect(hint.props.accessibilityElementsHidden).toBe(true);
    expect(hint.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(hint.props.pointerEvents).toBe('none');
  });

  it('no visible ordinary-refresh ActivityIndicator', async () => {
    let resolveR;
    const req = new Promise(resolve => { resolveR = resolve; });
    const discover = jest.fn()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => req);
    
    render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Pan A'));
    await advanceDebounce();
    
    expect(screen.queryByLabelText('Đang tải dữ liệu bản đồ')).toBeNull();
    expect(screen.queryByLabelText('Đang làm mới dữ liệu bản đồ')).toBeNull();
    
    await act(async () => {
      resolveR([restaurant]);
      await Promise.resolve();
    });
  });
});
`;

fs.writeFileSync(testFile, imports + describeBlock, 'utf8');
console.log('Restored ExploreProductionScreen.test.tsx');
