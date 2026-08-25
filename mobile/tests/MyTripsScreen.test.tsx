import { act, cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import {
  generateLargeMockTrips,
  mockPastTrips,
  mockUpcomingTrips,
} from '../src/features/trips/data/mockTrips';
import { MyTripsScreen } from '../src/features/trips/screens/MyTripsScreen';
import { SequentialTripCoverImageRepository } from '../src/integration/imageResolution';
import type { ResolvedImage, SavedTripSummary } from '../src/integration/contracts';
import type {
  DestinationCoverRepository,
  PlacePhotoRepository,
  SavedTripsRepository,
  WikimediaImageRepository,
} from '../src/integration/repositories';
import { asGooglePlaceId, asTripId } from '../src/integration/validation';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
let mockFocusListener: (() => void) | undefined;
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      addListener: (_event: string, listener: () => void) => {
        mockFocusListener = listener;
        return jest.fn();
      },
    }),
  };
});

const remoteTrip: SavedTripSummary = {
  id: asTripId('11111111-1111-4111-8111-111111111111'),
  title: 'Bangkok Explorer',
  destination: 'Bangkok, Thailand',
  startDate: '2027-01-10',
  endDate: '2027-01-11',
  estimatedBudget: null,
  currency: null,
  createdAt: '2026-08-24T00:00:00.000Z',
  dayCount: 2,
  itemCount: 4,
  coverGooglePlaceIds: [
    asGooglePlaceId('ChIJaSv_6gaZ4jARnbiUVn6Z_YY'),
    asGooglePlaceId('ChIJPzZsMU6Z4jARQUzvk913bCo'),
  ],
};

function createSavedTripsRepository(items: SavedTripSummary[] = [remoteTrip]): {
  repository: SavedTripsRepository;
  getDetail: jest.Mock;
  list: jest.Mock;
} {
  const list = jest.fn(async () => ({ items, nextCursor: null }));
  const getDetail = jest.fn(async () => null);
  return {
    list,
    getDetail,
    repository: {
      list,
      getDetail,
      updateItemNote: async () => false,
      deleteTrip: async () => false,
      getStats: async () => ({ tripsCount: items.length, savedPlacesCount: 0 }),
    },
  };
}

function createPhotoRepository(
  getPhoto: PlacePhotoRepository['getPhoto'],
): PlacePhotoRepository {
  return { getPhoto };
}

describe('MyTripsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusListener = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders MyTripsScreen with top bar, headings, upcoming/past sections, and FAB', async () => {
    await render(<MyTripsScreen fixtureMode />);

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

    await render(<MyTripsScreen fixtureMode onSelectTrip={onSelectTripMock} />);

    await user.press(
      screen.getByLabelText('Kyoto Autumn Retreat, Kyoto, Japan, Oct 14 - Oct 22')
    );

    expect(onSelectTripMock).toHaveBeenCalledWith('trip_kyoto');
  });

  it('handles past trip card selection', async () => {
    const user = userEvent.setup();
    const onSelectTripMock = jest.fn();

    await render(<MyTripsScreen fixtureMode onSelectTrip={onSelectTripMock} />);

    await user.press(screen.getByLabelText('Swiss Alps Hiking, Aug 2023'));

    expect(onSelectTripMock).toHaveBeenCalledWith('trip_swiss');
  });

  it('triggers create trip when FAB is pressed', async () => {
    const user = userEvent.setup();
    const onCreateTripMock = jest.fn();

    await render(<MyTripsScreen fixtureMode onCreateTrip={onCreateTripMock} />);

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

    await render(<MyTripsScreen fixtureMode initialStatus="error" />);

    expect(screen.getByText('Unable to load trips')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    await user.press(screen.getByLabelText('Thử lại'));

    await waitFor(() => {
      expect(screen.queryByText('Unable to load trips')).toBeNull();
    });
    expect(screen.getByText('Kyoto Autumn Retreat')).toBeTruthy();
  });

  it('uses an empty safe state without a repository or explicit fixture', async () => {
    await render(<MyTripsScreen />);

    expect(screen.getByText('No trips yet')).toBeTruthy();
    expect(screen.queryByText('Kyoto Autumn Retreat')).toBeNull();
  });

  it('enriches a remote trip card from the trusted compact cover identity without detail N+1', async () => {
    const { repository, getDetail, list } = createSavedTripsRepository();
    const getPhoto = jest.fn(async ({ googlePlaceId }: { googlePlaceId: string }) => ({
      googlePlaceId,
      photoUri: 'https://lh3.googleusercontent.com/places/bangkok-cover.jpg',
    }));

    await render(
      <MyTripsScreen
        photoRepository={createPhotoRepository(getPhoto)}
        repository={repository}
      />
    );

    expect(await screen.findByLabelText('Bangkok Explorer cover photo')).toBeTruthy();
    expect(list).toHaveBeenCalledWith({ limit: 20 });
    expect(getDetail).not.toHaveBeenCalled();
    expect(getPhoto).toHaveBeenCalledTimes(1);
    expect(getPhoto).toHaveBeenCalledWith(
      { googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY', maxWidth: 600 },
      expect.any(AbortSignal),
    );
  });

  it('preserves the second-candidate Wikimedia image and attribution through hook state and card rerender', async () => {
    const { repository } = createSavedTripsRepository();
    const google: PlacePhotoRepository = {
      getPhoto: jest.fn(async ({ googlePlaceId }) => ({ googlePlaceId, photoUri: null })),
    };
    const wikipediaImage: ResolvedImage = {
      uri: 'https://upload.wikimedia.org/grand-palace.jpg',
      source: 'WIKIMEDIA_PLACE',
      attribution: {
        displayName: 'Commons author',
        license: 'CC BY-SA 4.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Grand_Palace.jpg',
      },
    };
    const wikipedia: WikimediaImageRepository = {
      getImage: jest.fn()
        .mockResolvedValueOnce({ uri: null, source: 'PLACEHOLDER' })
        .mockResolvedValueOnce(wikipediaImage),
    };
    const destination: DestinationCoverRepository = {
      getDestinationCover: jest.fn(async () => ({ uri: null, source: 'PLACEHOLDER' as const })),
    };

    await render(
      <MyTripsScreen
        repository={repository}
        tripCoverRepository={new SequentialTripCoverImageRepository(google, wikipedia, destination)}
      />
    );

    expect(await screen.findByLabelText('Bangkok Explorer cover photo')).toBeTruthy();
    expect(screen.getByText('Commons author · CC BY-SA 4.0')).toBeTruthy();
    expect(google.getPhoto).toHaveBeenCalledTimes(2);
    expect(wikipedia.getImage).toHaveBeenCalledTimes(2);
    expect(destination.getDestinationCover).not.toHaveBeenCalled();
  });

  it('does not cancel and restart the same cover work when focus reload returns identical identities', async () => {
    const { repository, list } = createSavedTripsRepository();
    const getTripCover = jest.fn(async () => ({
      uri: 'https://upload.wikimedia.org/grand-palace.jpg',
      source: 'WIKIMEDIA_PLACE' as const,
    }));

    await render(
      <MyTripsScreen repository={repository} tripCoverRepository={{ getTripCover }} />
    );
    expect(await screen.findByLabelText('Bangkok Explorer cover photo')).toBeTruthy();
    expect(getTripCover).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockFocusListener?.();
    });
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(getTripCover).toHaveBeenCalledTimes(1);
  });

  it('deduplicates a focus refresh while the initial trip-list request is still pending', async () => {
    let resolveList: ((value: { items: SavedTripSummary[]; nextCursor: null }) => void) | undefined;
    const list = jest.fn(() => new Promise<{ items: SavedTripSummary[]; nextCursor: null }>((resolve) => {
      resolveList = resolve;
    }));
    const repository: SavedTripsRepository = {
      ...createSavedTripsRepository().repository,
      list,
    };

    await render(<MyTripsScreen repository={repository} />);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    await act(async () => {
      mockFocusListener?.();
    });
    expect(list).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveList?.({ items: [remoteTrip], nextCursor: null });
    });
    expect(await screen.findByText('Bangkok Explorer')).toBeTruthy();
  });

  it('keeps settled trip content visible while a focus refresh runs in the background', async () => {
    let resolveRefresh: ((value: { items: SavedTripSummary[]; nextCursor: null }) => void) | undefined;
    const list = jest.fn()
      .mockResolvedValueOnce({ items: [remoteTrip], nextCursor: null })
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveRefresh = resolve;
      }));
    const repository: SavedTripsRepository = {
      ...createSavedTripsRepository().repository,
      list,
    };

    await render(<MyTripsScreen repository={repository} />);
    expect(await screen.findByText('Bangkok Explorer')).toBeTruthy();

    await act(async () => {
      mockFocusListener?.();
    });
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Bangkok Explorer')).toBeTruthy();
    expect(screen.queryByLabelText('Đang tải danh sách chuyến đi')).toBeNull();

    await act(async () => {
      resolveRefresh?.({ items: [remoteTrip], nextCursor: null });
    });
  });

  it('keeps the trip visible and uses no fake cover when both trusted candidates have no photo', async () => {
    const { repository } = createSavedTripsRepository();
    const getPhoto = jest.fn(async ({ googlePlaceId }: { googlePlaceId: string }) => ({
      googlePlaceId,
      photoUri: null,
    }));

    await render(
      <MyTripsScreen
        photoRepository={createPhotoRepository(getPhoto)}
        repository={repository}
      />
    );

    expect(await screen.findByText('Bangkok Explorer')).toBeTruthy();
    await waitFor(() => expect(getPhoto).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText('Bangkok Explorer cover photo')).toBeNull();
    expect(screen.queryByText('Unable to load trips')).toBeNull();
  });

  it('isolates provider failures from the trip-list state', async () => {
    const { repository } = createSavedTripsRepository();
    const getPhoto = jest.fn(async () => {
      throw new Error('provider unavailable');
    });

    await render(
      <MyTripsScreen
        photoRepository={createPhotoRepository(getPhoto)}
        repository={repository}
      />
    );

    expect(await screen.findByText('Bangkok Explorer')).toBeTruthy();
    await waitFor(() => expect(getPhoto).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Unable to load trips')).toBeNull();
    expect(screen.queryByLabelText('Bangkok Explorer cover photo')).toBeNull();
  });

  it('keeps explicit fixtures deterministic without invoking the live photo repository', async () => {
    const getPhoto = jest.fn(async ({ googlePlaceId }: { googlePlaceId: string }) => ({
      googlePlaceId,
      photoUri: 'https://example.invalid/fixture-must-not-load.jpg',
    }));

    await render(
      <MyTripsScreen
        fixtureMode
        photoRepository={createPhotoRepository(getPhoto)}
      />
    );

    expect(screen.getByText('Kyoto Autumn Retreat')).toBeTruthy();
    expect(getPhoto).not.toHaveBeenCalled();
  });
});
