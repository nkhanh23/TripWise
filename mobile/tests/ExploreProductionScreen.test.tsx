import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ExploreDiscoveredPlace, ExplorePlacesRequest } from '../src/integration/contracts';
import type { ExplorePlacesRepository } from '../src/integration/repositories';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/features/explore/components/ExploreMapCanvas', () => ({
  INITIAL_EXPLORE_REGION: { latitude: 13.76, longitude: 100.52, latitudeDelta: 0.14, longitudeDelta: 0.22 },
  ExploreMapCanvas: ({ markerItems, onRegionChangeComplete }: any) => {
    const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
    return <MockView accessibilityLabel="Production Explore Map">
      {markerItems.flatMap((item: any) => item.type === 'place' ? [<MockText key={item.place.id}>{item.place.name}</MockText>] : [])}
      <MockPressable accessibilityLabel="Pan A" onPress={() => onRegionChangeComplete?.({ latitude: 13.7, longitude: 100.5, latitudeDelta: 0.04, longitudeDelta: 0.04 })} />
      <MockPressable accessibilityLabel="Pan B" onPress={() => onRegionChangeComplete?.({ latitude: 13.8, longitude: 100.6, latitudeDelta: 0.04, longitudeDelta: 0.04 })} />
    </MockView>;
  },
}));

import { ExploreScreen } from '../src/features/explore/ExploreScreen';

const attraction: ExploreDiscoveredPlace = {
  googlePlaceId: 'ChIJfixture12345' as never, name: 'Wat Arun', coordinate: { latitude: 13.7437, longitude: 100.4888 },
  category: 'attractions', categoryLabel: 'Attraction', address: 'Bangkok', rating: 4.8, userRatingCount: 120,
};
const restaurant: ExploreDiscoveredPlace = {
  googlePlaceId: 'ChIJfixture67890' as never, name: 'Real Restaurant', coordinate: { latitude: 13.75, longitude: 100.5 },
  category: 'restaurants', categoryLabel: 'Restaurant',
};

function repository(implementation: (request: ExplorePlacesRequest, signal?: AbortSignal) => Promise<ExploreDiscoveredPlace[]>): ExplorePlacesRepository {
  return { discover: jest.fn(implementation) };
}

describe('production Explore discovery', () => {
  afterEach(() => { cleanup(); });

  it('loads production results and locally filters and restores search', async () => {
    let resolveInitial!: (value: ExploreDiscoveredPlace[]) => void;
    const repo = repository(() => new Promise((resolve) => { resolveInitial = resolve; }));
    await render(<ExploreScreen repository={repo} />);
    expect(screen.getByLabelText('Đang tải dữ liệu bản đồ')).toBeTruthy();
    await act(async () => { resolveInitial([attraction, restaurant]); });
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
    await act(async () => { fireEvent.changeText(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), 'Real'); });
    expect(screen.queryByText('Wat Arun')).toBeNull();
    await act(async () => { fireEvent.changeText(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), ''); });
    expect(screen.getByText('Wat Arun')).toBeTruthy();
  });

  it('loads each selected category from the repository and clears stale results while loading', async () => {
    const repo = repository((value) => Promise.resolve(value.category === 'restaurants' ? [restaurant] : [attraction]));
    await render(<ExploreScreen repository={repo} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByLabelText('Attractions')); });
    await waitFor(() => expect(repo.discover).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'attractions', limit: 12 }), expect.anything()));
    await act(async () => { fireEvent.press(screen.getByLabelText('Restaurants')); });
    expect(screen.queryByText('Wat Arun')).toBeNull();
    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());
  });

  it('shows true empty success and retries an actual remote failure', async () => {
    const discover = jest.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([]);
    await render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Unable to load map')).toBeTruthy());
    fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('No places found')).toBeTruthy());
    expect(discover).toHaveBeenCalledTimes(2);
  });

  it('debounces settled region changes and ignores a slower stale response', async () => {
    let resolveOld!: (value: ExploreDiscoveredPlace[]) => void;
    const old = new Promise<ExploreDiscoveredPlace[]>((resolve) => { resolveOld = resolve; });
    const discover = jest.fn()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => old)
      .mockResolvedValueOnce([restaurant]);
    await render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Pan A'));
    await waitFor(() => expect(discover).toHaveBeenCalledTimes(2), { timeout: 1_000 });
    fireEvent.press(screen.getByLabelText('Pan B'));
    await waitFor(() => expect(discover).toHaveBeenCalledTimes(3), { timeout: 1_000 });
    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());
    await act(async () => { resolveOld([attraction]); await Promise.resolve(); });
    expect(screen.queryByText('Wat Arun')).toBeNull();
  });
});
