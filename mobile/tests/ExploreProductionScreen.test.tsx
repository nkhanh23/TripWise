import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

import type { ExploreDiscoveredPlace, ExplorePlacesRequest } from '../src/integration/contracts';
import type { ExplorePlacesRepository } from '../src/integration/repositories';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../src/features/explore/components/ExploreMapCanvas', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  const INITIAL_EXPLORE_REGION = {
    latitude: 13.76,
    longitude: 100.52,
    latitudeDelta: 0.14,
    longitudeDelta: 0.22,
  };
  const REGION_A = {
    latitude: 13.7,
    longitude: 100.5,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };
  const REGION_B = {
    latitude: 13.8,
    longitude: 100.6,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  function renderNames(markerItems: any[]) {
    return markerItems.flatMap((item) =>
      item.type === 'place' ? [item.place.name] : item.places.map((place: any) => place.name)
    );
  }

  function Control({ label, onPress }: { label: string; onPress: () => void }) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  }

  const ExploreMapCanvas = ({
    markerItems,
    markersDimmed,
    onMovementStateChange,
    onRegionChangeComplete,
    status,
  }: any) => (
    <View accessibilityLabel="Production Explore Map">
      <Text testID="mock-map-status">{status}</Text>
      <Text testID="mock-markers-dimmed">{markersDimmed ? 'dimmed' : 'normal'}</Text>
      {renderNames(markerItems).map((name: string) => (
        <Text key={name}>{name}</Text>
      ))}
      <Control label="Start moving" onPress={() => onMovementStateChange?.(true)} />
      <Control label="Pan A" onPress={() => onRegionChangeComplete?.(REGION_A, { isGesture: true })} />
      <Control label="Pan A Again" onPress={() => onRegionChangeComplete?.(REGION_A, { isGesture: true })} />
      <Control label="Pan B" onPress={() => onRegionChangeComplete?.(REGION_B, { isGesture: true })} />
      <Control label="Return Initial" onPress={() => onRegionChangeComplete?.(INITIAL_EXPLORE_REGION, { isGesture: true })} />
    </View>
  );

  return {
    INITIAL_EXPLORE_REGION,
    ExploreMapCanvas,
  };
});

import { ExploreScreen } from '../src/features/explore/ExploreScreen';

const attraction: ExploreDiscoveredPlace = {
  googlePlaceId: 'ChIJfixture12345' as never,
  name: 'Wat Arun',
  coordinate: { latitude: 13.7437, longitude: 100.4888 },
  category: 'attractions',
  categoryLabel: 'Attraction',
  address: 'Bangkok',
  rating: 4.8,
  userRatingCount: 120,
};

const staleViewportA: ExploreDiscoveredPlace = {
  googlePlaceId: 'ChIJstaleA12345' as never,
  name: 'Stale Viewport A',
  coordinate: { latitude: 13.744, longitude: 100.489 },
  category: 'attractions',
  categoryLabel: 'Attraction',
};

const restaurant: ExploreDiscoveredPlace = {
  googlePlaceId: 'ChIJfixture67890' as never,
  name: 'Real Restaurant',
  coordinate: { latitude: 13.75, longitude: 100.5 },
  category: 'restaurants',
  categoryLabel: 'Restaurant',
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createRepository(
  implementation: (request: ExplorePlacesRequest, signal?: AbortSignal) => Promise<ExploreDiscoveredPlace[]>
): ExplorePlacesRepository {
  return { discover: jest.fn(implementation) };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function advanceTimers(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('production Explore discovery', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('1. shows true initial loading before the first provider result resolves', async () => {
    const initialRequest = createDeferred<ExploreDiscoveredPlace[]>();
    const repo = createRepository(() => initialRequest.promise);

    const view = await render(<ExploreScreen repository={repo} />);

    expect(view.getByLabelText('Đang tải dữ liệu bản đồ')).toBeTruthy();
    expect(repo.discover).toHaveBeenCalledTimes(1);
  });

  it('2. renders real initial success from the repository', async () => {
    const repo = createRepository(() => Promise.resolve([attraction]));
    const view = await render(<ExploreScreen repository={repo} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    expect(view.queryByLabelText('Đang tải dữ liệu bản đồ')).toBeNull();
    expect(repo.discover).toHaveBeenCalledTimes(1);
  });

  it('3. keeps search local-only with zero extra provider calls', async () => {
    const repo = createRepository(() => Promise.resolve([attraction, restaurant]));
    const view = await render(<ExploreScreen repository={repo} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    fireEvent.changeText(view.getByLabelText('Tìm kiếm địa điểm'), 'Real');
    await waitFor(() => expect(view.queryByText('Wat Arun')).toBeNull());
    fireEvent.changeText(view.getByLabelText('Tìm kiếm địa điểm'), '');
    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    expect(repo.discover).toHaveBeenCalledTimes(1);
  });

  it('4. keeps confirmed markers visible during continuous movement with zero provider calls', async () => {
    const repo = createRepository(() => Promise.resolve([attraction]));
    const view = await render(<ExploreScreen repository={repo} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    fireEvent.press(view.getByText('Start moving'));

    await waitFor(() => expect(view.getByTestId('mock-map-status').props.children).toBe('moving'));
    expect(view.getByText('Wat Arun')).toBeTruthy();
    expect(view.queryByLabelText('Đang tải dữ liệu bản đồ')).toBeNull();
    expect(repo.discover).toHaveBeenCalledTimes(1);
  });

  it('5. waits 399ms with no call, then fires exactly one settled viewport request at 400ms', async () => {
    const settleRequest = createDeferred<ExploreDiscoveredPlace[]>();
    const discover = jest
      .fn<Promise<ExploreDiscoveredPlace[]>, [ExplorePlacesRequest, AbortSignal | undefined]>()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => settleRequest.promise);
    const view = await render(<ExploreScreen repository={{ discover }} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.press(view.getByText('Pan A'));

    await advanceTimers(399);
    expect(discover).toHaveBeenCalledTimes(1);

    await advanceTimers(1);
    expect(discover).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
    settleRequest.resolve([restaurant]);
    await waitFor(() => expect(view.getByText('Real Restaurant')).toBeTruthy());
  });

  it('6. immediately invalidates active A, preserves confirmed markers during the 400ms B debounce, and starts exactly one B request', async () => {
    const viewportARequest = createDeferred<ExploreDiscoveredPlace[]>();
    const viewportBRequest = createDeferred<ExploreDiscoveredPlace[]>();
    const discover = jest
      .fn<Promise<ExploreDiscoveredPlace[]>, [ExplorePlacesRequest, AbortSignal | undefined]>()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => viewportARequest.promise)
      .mockImplementationOnce(() => viewportBRequest.promise);
    const view = await render(<ExploreScreen repository={{ discover }} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.press(view.getByText('Pan A'));

    await advanceTimers(400);
    expect(discover).toHaveBeenCalledTimes(2);

    fireEvent.press(view.getByText('Pan B'));

    await advanceTimers(100);
    expect(discover).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
    viewportARequest.resolve([staleViewportA]);
    await flushMicrotasks();

    expect(view.queryByText('Stale Viewport A')).toBeNull();
    expect(view.getByText('Wat Arun')).toBeTruthy();

    jest.useFakeTimers();
    await advanceTimers(300);
    expect(discover).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
    viewportBRequest.resolve([restaurant]);
    await waitFor(() => expect(view.getByText('Real Restaurant')).toBeTruthy());
    expect(view.queryByText('Wat Arun')).toBeNull();
  });

  it('7. dedupes equivalent settled viewport requests', async () => {
    const discover = jest
      .fn<Promise<ExploreDiscoveredPlace[]>, [ExplorePlacesRequest, AbortSignal | undefined]>()
      .mockResolvedValueOnce([attraction])
      .mockResolvedValueOnce([restaurant]);
    const view = await render(<ExploreScreen repository={{ discover }} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.press(view.getByText('Pan A'));

    await advanceTimers(400);
    jest.useRealTimers();
    await waitFor(() => expect(view.getByText('Real Restaurant')).toBeTruthy());
    expect(discover).toHaveBeenCalledTimes(2);

    jest.useFakeTimers();
    fireEvent.press(view.getByText('Pan A Again'));

    await advanceTimers(500);
    expect(discover).toHaveBeenCalledTimes(2);
  });

  it('8. cancels pending B and avoids an unnecessary request when returning to authoritative A', async () => {
    const repo = createRepository(() => Promise.resolve([attraction]));
    const view = await render(<ExploreScreen repository={repo} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.press(view.getByText('Pan B'));
    fireEvent.press(view.getByText('Return Initial'));

    await advanceTimers(500);

    expect(repo.discover).toHaveBeenCalledTimes(1);
    expect(view.getByText('Wat Arun')).toBeTruthy();
  });

  it('9. category change issues exactly one request, keeps stale markers dimmed without a loading wheel, and replaces them only with fresh authoritative results', async () => {
    const categoryRequest = createDeferred<ExploreDiscoveredPlace[]>();
    const discover = jest
      .fn<Promise<ExploreDiscoveredPlace[]>, [ExplorePlacesRequest, AbortSignal | undefined]>()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => categoryRequest.promise);
    const view = await render(<ExploreScreen repository={{ discover }} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    fireEvent.press(view.getByText('Restaurants'));

    expect(discover).toHaveBeenCalledTimes(2);
    expect(view.queryByLabelText('Đang tải dữ liệu bản đồ')).toBeNull();
    expect(view.getByTestId('mock-markers-dimmed').props.children).toBe('dimmed');
    expect(view.getByText('Wat Arun')).toBeTruthy();

    categoryRequest.resolve([restaurant]);
    await waitFor(() => expect(view.getByText('Real Restaurant')).toBeTruthy());

    expect(view.queryByText('Wat Arun')).toBeNull();
    expect(view.getByTestId('mock-markers-dimmed').props.children).toBe('normal');
  });

  it('10. preserves confirmed markers and avoids the blocking map error when a background refresh really rejects', async () => {
    const backgroundRefresh = createDeferred<ExploreDiscoveredPlace[]>();
    const discover = jest
      .fn<Promise<ExploreDiscoveredPlace[]>, [ExplorePlacesRequest, AbortSignal | undefined]>()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => backgroundRefresh.promise);
    const view = await render(<ExploreScreen repository={{ discover }} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.press(view.getByText('Pan A'));

    await advanceTimers(400);
    expect(discover).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
    backgroundRefresh.reject(new Error('network'));
    await waitFor(() => expect(view.getByLabelText('Thử lại tải dữ liệu bản đồ')).toBeTruthy());

    expect(view.getByText('Wat Arun')).toBeTruthy();
    expect(view.queryByText('Unable to load map')).toBeNull();
  });

  it('11. shows the initial error state and retries successfully', async () => {
    const discover = jest
      .fn<Promise<ExploreDiscoveredPlace[]>, [ExplorePlacesRequest, AbortSignal | undefined]>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([attraction]);
    const view = await render(<ExploreScreen repository={{ discover }} />);

    await waitFor(() => expect(view.getByText('Unable to load map')).toBeTruthy());
    fireEvent.press(view.getByText('Retry'));
    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    expect(discover).toHaveBeenCalledTimes(2);
  });

  it('12. never shows the blocking ActivityIndicator during an ordinary refresh', async () => {
    const refreshRequest = createDeferred<ExploreDiscoveredPlace[]>();
    const discover = jest
      .fn<Promise<ExploreDiscoveredPlace[]>, [ExplorePlacesRequest, AbortSignal | undefined]>()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => refreshRequest.promise);
    const view = await render(<ExploreScreen repository={{ discover }} />);

    await waitFor(() => expect(view.getByText('Wat Arun')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.press(view.getByText('Pan A'));

    await advanceTimers(400);

    expect(discover).toHaveBeenCalledTimes(2);
    expect(view.queryByLabelText('Đang tải dữ liệu bản đồ')).toBeNull();
    expect(view.getByText('Wat Arun')).toBeTruthy();

    jest.useRealTimers();
    refreshRequest.resolve([restaurant]);
    await waitFor(() => expect(view.getByText('Real Restaurant')).toBeTruthy());
  });
});
