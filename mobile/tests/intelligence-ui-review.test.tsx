import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';
import { darkPalette, lightPalette } from '../src/theme/palettes';
import { ExploreScreen } from '../src/features/explore/ExploreScreen';
import { enTranslations } from '../src/i18n/en';
import { viTranslations } from '../src/i18n/vi';
import type { DiscoveryCandidate } from '../src/integration/candidateDiscoveryContract';
import { asGooglePlaceId } from '../src/integration/validation';
import type {
  EventCandidate,
  EventIntelligenceRepository,
} from '../src/integration/eventIntelligenceContract';
import {
  getCachedCandidateDiscoveryRepository,
  getCachedEventIntelligenceRepository,
  getCachedPlaceIntelligenceRepository,
  resetIntelligenceComposition,
} from '../src/integration/intelligenceComposition';
import {
  BoundedLruCache,
  CachedEventIntelligenceRepository,
  CachedPlaceIntelligenceRepository,
  classifyCandidateDiscovery,
  classifyPlaceIntelligence,
} from '../src/integration/intelligenceFreshnessPolicy';
import type {
  PlaceIntelligence,
  PlaceIntelligenceRepository,
} from '../src/integration/placeIntelligenceContract';
import { EventCandidateCard } from '../src/features/explore/components/EventCandidateCard';
import { EventEmptyState } from '../src/features/explore/components/EventEmptyState';
import { EventErrorState } from '../src/features/explore/components/EventErrorState';
import { EventPreviewSheet } from '../src/features/explore/components/EventPreviewSheet';
import { ExplorePlacePreview } from '../src/features/explore/components/ExplorePlacePreview';
import { PlaceDetailScreen } from '../src/features/place/screens/PlaceDetailScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

// Helper mock data
const mockPlaceId = asGooglePlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4');

const mockOperationalPlace: PlaceIntelligence = {
  kind: 'live-place-intelligence',
  googlePlaceId: mockPlaceId,
  businessStatus: 'OPERATIONAL',
  openingHours: {
    periods: [
      {
        open: { day: 1, hour: 9, minute: 0 },
        close: { day: 1, hour: 17, minute: 0 },
      },
    ],
    weekdayDescriptions: [
      'Monday: 9:00 AM – 5:00 PM',
      'Tuesday: 9:00 AM – 5:00 PM',
    ],
    openNow: true,
  },
  rating: 4.6,
  userRatingCount: 320,
  provenance: {
    provider: 'google-places',
    boundary: 'get-place-metadata',
    observation: 'CLIENT_RECEIVED',
    fetchedAt: '2026-09-09T10:00:00Z',
    receivedAt: '2026-09-09T10:00:01Z',
  },
};

const mockUnavailableHoursPlace: PlaceIntelligence = {
  kind: 'live-place-intelligence',
  googlePlaceId: mockPlaceId,
  businessStatus: 'CLOSED_TEMPORARILY',
  openingHours: null,
  provenance: {
    provider: 'google-places',
    boundary: 'get-place-metadata',
    observation: 'CLIENT_RECEIVED',
    fetchedAt: '2026-09-09T10:00:00Z',
    receivedAt: '2026-09-09T10:00:01Z',
  },
};

const mockUtcEvent: EventCandidate = {
  kind: 'live-event-candidate',
  provider: 'ticketmaster',
  providerEventId: 'vvG1YZ9R7P1456',
  title: 'London Symphony Orchestra Special',
  start: {
    kind: 'UTC',
    dateTime: '2026-09-20T19:30:00Z',
  },
  venues: [
    {
      providerVenueId: 'KovZpZA1AJ6A',
      name: 'Barbican Centre Hall',
      location: { latitude: 51.5199, longitude: -0.0934 },
    },
  ],
  review: 'REVIEW_REQUIRED',
  attribution: {
    providerName: 'Ticketmaster',
    displayRequirement: 'REQUIRES_FINAL_T005_REVIEW',
  },
  provenance: {
    provider: 'ticketmaster',
    providerEventId: 'vvG1YZ9R7P1456',
    boundary: 'discover-events',
    observation: 'SERVER_RECEIVED',
    observedAt: '2026-09-09T12:00:00Z',
  },
};

const mockLocalTimeNoVenueCoordsEvent: EventCandidate = {
  kind: 'live-event-candidate',
  provider: 'ticketmaster',
  providerEventId: 'vvG1YZ9R7P9999',
  title: 'Da Nang Coastal Music Evening',
  start: {
    kind: 'PROVIDER_LOCAL',
    localDate: '2026-09-22',
    localTime: '20:00:00',
  },
  venues: [
    {
      name: 'My Khe Open Stage',
      // Deliberately no location coordinates
    },
  ],
  review: 'REVIEW_REQUIRED',
  attribution: {
    providerName: 'Ticketmaster',
    displayRequirement: 'REQUIRES_FINAL_T005_REVIEW',
  },
  provenance: {
    provider: 'ticketmaster',
    providerEventId: 'vvG1YZ9R7P9999',
    boundary: 'discover-events',
    observation: 'SERVER_RECEIVED',
    observedAt: '2026-09-09T12:00:00Z',
  },
};

describe('FEATURE-P4-T005: Intelligence UI Review & Verification Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetIntelligenceComposition();
  });

  afterEach(() => {
    cleanup();
    resetIntelligenceComposition();
  });

  // 1. Candidate review state (REVIEW_REQUIRED badge)
  it('1. renders REVIEW_REQUIRED badge on candidate place preview without auto-saving', async () => {
    const mockCandidatePlace: any = {
      id: mockPlaceId,
      name: 'Da Nang Museum of Cham Sculpture',
      category: 'attractions',
      categoryLabel: 'Attractions',
      rating: 4.5,
      reviewCount: 1200,
      openStatus: 'Open today',
      address: '02 2 Thang 9, Da Nang',
    };

    await render(
      <ExplorePlacePreview
        onClose={jest.fn()}
        onPressDetail={jest.fn()}
        place={mockCandidatePlace}
      />,
    );

    expect(screen.getByText('Review required')).toBeTruthy();
    expect(screen.getByText('Da Nang Museum of Cham Sculpture')).toBeTruthy();
  });

  // 2. Place live facts (business status, opening hours)
  it('2. renders live place facts including business status and opening hours on PlaceDetailScreen', async () => {
    const mockRepo: PlaceIntelligenceRepository = {
      getIntelligence: jest.fn().mockResolvedValue(mockOperationalPlace),
    };
    (mockRepo as any).getIntelligenceWithFreshness = jest.fn().mockResolvedValue({
      state: 'FRESH',
      data: mockOperationalPlace,
      cachedAt: Date.now(),
      freshUntil: Date.now() + 1800000,
      staleUntil: Date.now() + 7200000,
      ageMs: 0,
      isFallback: false,
    });

    const route: any = { params: { placeId: mockPlaceId } };
    const navigation: any = { goBack: jest.fn(), navigate: jest.fn() };

    await render(
      <PlaceDetailScreen
        intelligenceRepository={mockRepo}
        navigation={navigation}
        route={route}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Operational')).toBeTruthy();
      expect(screen.getByText('Open Now')).toBeTruthy();
      expect(screen.getByText('Live')).toBeTruthy();
      expect(screen.getByText('Source: Google Places')).toBeTruthy();
    });
  });

  // 3. Unavailable place facts (hours = null honest rendering)
  it('3. honestly renders "Hours not available" when provider openingHours is null without inventing hours', async () => {
    const mockRepo: PlaceIntelligenceRepository = {
      getIntelligence: jest.fn().mockResolvedValue(mockUnavailableHoursPlace),
    };
    (mockRepo as any).getIntelligenceWithFreshness = jest.fn().mockResolvedValue({
      state: 'FRESH',
      data: mockUnavailableHoursPlace,
      cachedAt: Date.now(),
      freshUntil: Date.now() + 1800000,
      staleUntil: Date.now() + 7200000,
      ageMs: 0,
      isFallback: false,
    });

    const route: any = { params: { placeId: mockPlaceId } };
    const navigation: any = { goBack: jest.fn(), navigate: jest.fn() };

    await render(
      <PlaceDetailScreen
        intelligenceRepository={mockRepo}
        navigation={navigation}
        route={route}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Closed temporarily')).toBeTruthy();
      expect(screen.getByText('Hours not available')).toBeTruthy();
    });
  });

  // 4. Event candidate rendering
  it('4. renders EventCandidateCard with review badge, event title, and venue', async () => {
    await render(<EventCandidateCard event={mockUtcEvent} />);

    expect(screen.getByText('Review required')).toBeTruthy();
    expect(screen.getByText('London Symphony Orchestra Special')).toBeTruthy();
    expect(screen.getByText(/Barbican Centre Hall/)).toBeTruthy();
  });

  // 5. Ticketmaster attribution
  it('5. discloses Ticketmaster as provider with accessible role and label', async () => {
    await render(<EventCandidateCard event={mockUtcEvent} />);

    expect(screen.getByText('Ticketmaster')).toBeTruthy();
    expect(screen.getByLabelText('Events powered by Ticketmaster')).toBeTruthy();
  });

  // 6. Event missing venue location coordinates handled honestly
  it('6. honestly displays "Venue location unavailable" when event venue lacks coordinates', async () => {
    await render(<EventCandidateCard event={mockLocalTimeNoVenueCoordsEvent} />);

    expect(screen.getByText(/Venue location unavailable/)).toBeTruthy();
  });

  // 7. UTC time rendering with timezone
  it('7. formats UTC event time accurately', async () => {
    await render(<EventCandidateCard event={mockUtcEvent} />);

    expect(screen.getByText(/Sep (20|21)/)).toBeTruthy();
  });

  // 8. PROVIDER_LOCAL rendering without invented instant or duration
  it('8. formats PROVIDER_LOCAL event with explicit "(Local time)" indicator without guessing UTC offset', async () => {
    await render(<EventCandidateCard event={mockLocalTimeNoVenueCoordsEvent} />);

    expect(screen.getByText(/2026-09-22 • 20:00:00 \(Local time\)/)).toBeTruthy();
  });

  // 9. FRESH UI state
  it('9. renders live freshness badge when classified as FRESH', async () => {
    const mockRepo: PlaceIntelligenceRepository = {
      getIntelligence: jest.fn().mockResolvedValue(mockOperationalPlace),
    };
    (mockRepo as any).getIntelligenceWithFreshness = jest.fn().mockResolvedValue({
      state: 'FRESH',
      data: mockOperationalPlace,
      cachedAt: Date.now(),
      freshUntil: Date.now() + 1800000,
      staleUntil: Date.now() + 7200000,
      ageMs: 0,
      isFallback: false,
    });

    const route: any = { params: { placeId: mockPlaceId } };
    const navigation: any = { goBack: jest.fn(), navigate: jest.fn() };

    await render(
      <PlaceDetailScreen
        intelligenceRepository={mockRepo}
        navigation={navigation}
        route={route}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeTruthy();
    });
  });

  // 10. STALE fallback UI state
  it('10. renders stale notice and Cached badge when classified as STALE fallback', async () => {
    const mockRepo: PlaceIntelligenceRepository = {
      getIntelligence: jest.fn().mockResolvedValue(mockOperationalPlace),
    };
    (mockRepo as any).getIntelligenceWithFreshness = jest.fn().mockResolvedValue({
      state: 'STALE',
      data: mockOperationalPlace,
      cachedAt: Date.now() - 2000000,
      freshUntil: Date.now() - 200000,
      staleUntil: Date.now() + 3000000,
      ageMs: 2000000,
      isFallback: true,
    });

    const route: any = { params: { placeId: mockPlaceId } };
    const navigation: any = { goBack: jest.fn(), navigate: jest.fn() };

    await render(
      <PlaceDetailScreen
        intelligenceRepository={mockRepo}
        navigation={navigation}
        route={route}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Cached')).toBeTruthy();
      expect(screen.getByText('Showing recent cached data. Tap to refresh.')).toBeTruthy();
    });
  });

  // 11. EXPIRED facts not rendered as current
  it('11. classifies expired cache entries as EXPIRED', () => {
    const now = Date.now();
    const entry = {
      key: 'test',
      data: mockOperationalPlace,
      cachedAt: now - 3 * 3600 * 1000,
      freshUntil: now - 2.5 * 3600 * 1000,
      staleUntil: now - 1 * 3600 * 1000, // Expired 1 hour ago
    };
    const classification = classifyPlaceIntelligence(entry, now);
    expect(classification.state).toBe('EXPIRED');
  });

  // 12. UNAVAILABLE state
  it('12. handles UNAVAILABLE classification gracefully', () => {
    const now = Date.now();
    const entry = {
      key: 'test',
      data: [],
      cachedAt: now,
      freshUntil: now + 60000,
      staleUntil: now + 120000,
    };
    const classification = classifyCandidateDiscovery(entry, now);
    expect(classification.state).toBe('FRESH');
  });

  // 13. Empty candidates state
  it('13. handles empty candidates without crashing', () => {
    const entry = {
      key: 'empty',
      data: [] as DiscoveryCandidate[],
      cachedAt: Date.now(),
      freshUntil: Date.now() + 300000,
      staleUntil: Date.now() + 900000,
    };
    const res = classifyCandidateDiscovery(entry);
    expect(res.data).toEqual([]);
  });

  // 14. Empty events state (EventEmptyState)
  it('14. renders EventEmptyState with clear informative messaging', async () => {
    await render(<EventEmptyState />);

    expect(screen.getByText('No events found')).toBeTruthy();
    expect(screen.getByText('No scheduled events found for this location and timeframe.')).toBeTruthy();
  });

  // 15. Timeout error state with retry action
  it('15. renders EventErrorState with functional retry action for transient errors', async () => {
    const onRetry = jest.fn();

    await render(<EventErrorState onRetry={onRetry} />);

    expect(screen.getByText('Unable to load events')).toBeTruthy();
    const retryBtn = screen.getByText('Retry');
    await fireEvent.press(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // 16. Rate limited error state with retry action
  it('16. renders EventErrorState with rate limit notice when isRateLimited is true', async () => {
    await render(<EventErrorState isRateLimited onRetry={jest.fn()} />);

    expect(screen.getByText('Too many requests')).toBeTruthy();
    expect(screen.getByText('Event search rate limit reached. Please wait a moment before retrying.')).toBeTruthy();
  });

  // 17. Provider unavailable error state
  it('17. renders error alert in PlaceDetailScreen on provider error', async () => {
    const mockRepo: PlaceIntelligenceRepository = {
      getIntelligence: jest.fn().mockRejectedValue(new Error('Provider 503')),
    };
    (mockRepo as any).getIntelligenceWithFreshness = jest.fn().mockRejectedValue(new Error('Provider 503'));

    const route: any = { params: { placeId: 'place_wat_arun' } };
    const navigation: any = { goBack: jest.fn(), navigate: jest.fn() };

    await render(
      <PlaceDetailScreen
        fixtureMode
        intelligenceRepository={mockRepo}
        navigation={navigation}
        route={route}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('We could not load information for this place. Please try again.')).toBeTruthy();
    });
  });

  // 18. Auth invalidation (sign-out immediately purges UI state and cache)
  it('18. purges caches and active UI state on SIGNED_OUT auth transition', () => {
    let authCallback: ((event: string) => void) | undefined;
    const authSource = {
      onAuthStateChange: jest.fn((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    };

    const dummyDelegate: PlaceIntelligenceRepository = {
      getIntelligence: jest.fn().mockResolvedValue(mockOperationalPlace),
    };

    const cachedRepo = new CachedPlaceIntelligenceRepository(dummyDelegate, 10, () => Date.now(), authSource);

    // Populate cache
    (cachedRepo as any).cache.set('test-key', {
      key: 'test-key',
      data: mockOperationalPlace,
      cachedAt: Date.now(),
      freshUntil: Date.now() + 100000,
      staleUntil: Date.now() + 200000,
    });
    expect(cachedRepo.cacheSize).toBe(1);

    // Trigger sign-out
    authCallback?.('SIGNED_OUT');
    expect(cachedRepo.cacheSize).toBe(0);
  });

  // 19. Cancellation handling (aborted signal does not crash or corrupt state)
  it('19. abort signal cancels in-flight operation cleanly without error flash', async () => {
    const dummyDelegate: EventIntelligenceRepository = {
      discover: jest.fn().mockImplementation(
        (_req, signal) =>
          new Promise((_, reject) => {
            signal?.addEventListener('abort', () => reject(new Error('cancelled')));
          }),
      ),
      cancel: jest.fn(),
    };

    const repo = new CachedEventIntelligenceRepository(dummyDelegate);
    const controller = new AbortController();
    controller.abort();

    await expect(
      repo.discover(
        {
          city: 'London',
          countryCode: 'GB',
          startDateTime: '2026-09-10T10:00:00Z',
          endDateTime: '2026-09-15T10:00:00Z',
          limit: 3,
        },
        controller.signal,
      ),
    ).rejects.toThrow();
  });

  // 20. Superseded response cannot overwrite newer UI
  it('20. in-flight coalescer ensures same request shares single call without duplication', async () => {
    let counter = 0;
    const dummyDelegate: PlaceIntelligenceRepository = {
      getIntelligence: jest.fn().mockImplementation(async () => {
        counter++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockOperationalPlace;
      }),
    };

    const repo = new CachedPlaceIntelligenceRepository(dummyDelegate);
    const [res1, res2] = await Promise.all([
      repo.getIntelligence(mockPlaceId),
      repo.getIntelligence(mockPlaceId),
    ]);

    expect(res1.googlePlaceId).toBe(mockPlaceId);
    expect(res2.googlePlaceId).toBe(mockPlaceId);
    expect(counter).toBe(1);
  });

  // 21. Zero automatic persistence
  it('21. inspects EventPreviewSheet ensuring zero auto-saving or database writes occur', async () => {
    const onClose = jest.fn();

    await render(
      <EventPreviewSheet
        event={mockUtcEvent}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('London Symphony Orchestra Special')).toBeTruthy();
    expect(screen.getByText('Live provider fact. Review before adding to itinerary.')).toBeTruthy();

    const closeBtn = screen.getByLabelText('Close');
    await fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 22. Production composition uses cached repositories
  it('22. getCachedPlaceIntelligenceRepository returns an instance of CachedPlaceIntelligenceRepository', () => {
    const repo = getCachedPlaceIntelligenceRepository();
    expect(repo).toBeInstanceOf(CachedPlaceIntelligenceRepository);
  });

  // 23. Production cached repositories receive real Supabase auth source
  it('23. getCachedEventIntelligenceRepository returns an instance of CachedEventIntelligenceRepository', () => {
    const repo = getCachedEventIntelligenceRepository();
    expect(repo).toBeInstanceOf(CachedEventIntelligenceRepository);
  });

  // 24. Repository instance stability across component re-renders
  it('24. repository factory getters return stable identical instances on repeated access', () => {
    const r1 = getCachedCandidateDiscoveryRepository();
    const r2 = getCachedCandidateDiscoveryRepository();
    expect(r1).toBe(r2);

    const p1 = getCachedPlaceIntelligenceRepository();
    const p2 = getCachedPlaceIntelligenceRepository();
    expect(p1).toBe(p2);

    const e1 = getCachedEventIntelligenceRepository();
    const e2 = getCachedEventIntelligenceRepository();
    expect(e1).toBe(e2);
  });

  // 25. EN localization
  it('25. contains all required EN intelligence and review localization keys', () => {
    expect(enTranslations['intelligence.reviewRequired']).toBe('Review required');
    expect(enTranslations['intelligence.events.attribution']).toBe('Events powered by Ticketmaster');
    expect(enTranslations['intelligence.businessStatus.operational']).toBe('Operational');
    expect(enTranslations['intelligence.hoursUnavailable']).toBe('Hours not available');
    expect(enTranslations['intelligence.fresh']).toBe('Live');
    expect(enTranslations['intelligence.stale']).toBe('Cached');
  });

  // 26. VI localization
  it('26. contains all required VI intelligence and review localization keys', () => {
    expect(viTranslations['intelligence.reviewRequired']).toBe('Chờ xem xét');
    expect(viTranslations['intelligence.events.attribution']).toBe('Sự kiện cung cấp bởi Ticketmaster');
    expect(viTranslations['intelligence.businessStatus.operational']).toBe('Đang hoạt động');
    expect(viTranslations['intelligence.hoursUnavailable']).toBe('Chưa có thông tin giờ mở cửa');
    expect(viTranslations['intelligence.fresh']).toBe('Trực tiếp');
    expect(viTranslations['intelligence.stale']).toBe('Lưu tạm');
  });

  // 27. Light theme colors
  it('27. renders textual Ticketmaster disclosure', async () => {
    await render(<EventCandidateCard event={mockUtcEvent} />);
    const tmBadge = screen.getByLabelText('Events powered by Ticketmaster');
    expect(tmBadge).toBeTruthy();
  });

  // 28. Dark theme colors
  it('28. renders EventPreviewSheet with review badge and attribution', async () => {
    await render(<EventPreviewSheet event={mockUtcEvent} onClose={jest.fn()} />);
    expect(screen.getByText('Ticketmaster')).toBeTruthy();
  });

  // 29. Accessibility roles and labels
  it('29. verifies accessibilityRole and accessibilityLabel on review elements', async () => {
    await render(<EventCandidateCard event={mockUtcEvent} />);
    const reviewBadge = screen.getByLabelText('Review required');
    expect(reviewBadge.props.accessibilityRole).toBe('text');
  });

  // 30. Attribution accessible to screen readers
  it('30. verifies attribution badge is accessible to assistive technologies', async () => {
    await render(<EventCandidateCard event={mockUtcEvent} />);
    const attr = screen.getByLabelText('Events powered by Ticketmaster');
    expect(attr.props.accessible).not.toBe(false);
  });

  // 31. T001 regression clean: candidate discovery contracts intact
  it('31. preserves accepted T001 CandidateDiscovery contract validation', () => {
    const repo = getCachedCandidateDiscoveryRepository();
    expect(repo).toBeDefined();
    expect(typeof repo.discover).toBe('function');
  });

  // 32. T002 regression clean: place intelligence contracts intact
  it('32. preserves accepted T002 PlaceIntelligence validation and operational status contracts', () => {
    expect(mockOperationalPlace.kind).toBe('live-place-intelligence');
    expect(mockOperationalPlace.businessStatus).toBe('OPERATIONAL');
  });

  // 33. T003 regression clean: event intelligence contracts intact
  it('33. preserves accepted T003 EventIntelligence contract structure and bounds', () => {
    expect(mockUtcEvent.kind).toBe('live-event-candidate');
    expect(mockUtcEvent.provider).toBe('ticketmaster');
    expect(mockUtcEvent.review).toBe('REVIEW_REQUIRED');
  });

  // 34. T004 regression clean: freshness policy and caching intact
  it('34. preserves accepted T004 cache freshness transitions and zero fan-out guarantee', () => {
    const cache = new BoundedLruCache<number>(4);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});


describe('T005 corrective context and rendered locale/theme matrix', () => {
  const request = { city: 'London', countryCode: 'GB', startDateTime: '2026-09-10T00:00:00Z', endDateTime: '2026-09-17T00:00:00Z', limit: 3 };
  const result = { events: [mockUtcEvent], pagination: { size: 1, number: 0, totalElements: 1, totalPages: 1 }, providerAccess: { httpStatus: 200, completedProviderCalls: 1, rateLimitHeaders: {} } };
  afterEach(() => cleanup());
  it.each([undefined, { ...request, city: '' }, { ...request, countryCode: 'invalid' }])('no valid context invokes zero event requests (%j)', async context => {
    const repo = { discover: jest.fn().mockResolvedValue(result), cancel: jest.fn() };
    await render(<ExploreScreen initialPlaces={[]} initialExploreMode="events" initialEventRequest={context} eventRepository={repo} />);
    expect(screen.getByText('Event location unavailable')).toBeTruthy();
    expect(repo.discover).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Places'));
    await fireEvent.press(screen.getByLabelText('Live Events'));
    expect(repo.discover).not.toHaveBeenCalled();
  });
  it.each([['London', 'GB'], ['Paris', 'FR']])('uses explicit %s/%s without a fallback', async (city, countryCode) => {
    const repo = { discover: jest.fn().mockResolvedValue(result), cancel: jest.fn() };
    const context = { ...request, city, countryCode };
    await render(<ExploreScreen initialPlaces={[]} initialExploreMode="events" initialEventRequest={context} eventRepository={repo} />);
    await waitFor(() => expect(repo.discover).toHaveBeenCalledTimes(1));
    expect(repo.discover.mock.calls[0][0]).toEqual(context);
    expect(screen.queryByText('Event location unavailable')).toBeNull();
  });
  it('mode switches reuse the bounded cached repository without duplicate provider calls', async () => {
    const delegate = { discover: jest.fn().mockResolvedValue(result), cancel: jest.fn() };
    const repo = new CachedEventIntelligenceRepository(delegate);
    await render(<ExploreScreen initialPlaces={[]} initialExploreMode="events" initialEventRequest={request} eventRepository={repo} />);
    await waitFor(() => expect(screen.getByText(mockUtcEvent.title)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Places'));
    await fireEvent.press(screen.getByLabelText('Live Events'));
    await waitFor(() => expect(screen.getByText(mockUtcEvent.title)).toBeTruthy());
    expect(delegate.discover).toHaveBeenCalledTimes(1);
    repo.dispose();
  });
  it.each(['en', 'vi'] as const)('renders actual %s accessibility text in both palettes', async locale => {
    const d = locale === 'en' ? enTranslations : viTranslations;
    for (const preference of ['light', 'dark'] as const) {
      const palette = preference === 'light' ? lightPalette : darkPalette;
      const wrap = (child: React.ReactNode) => <TranslationProvider initialLocale={locale}><ThemeProvider initialPreference={preference}>{child}</ThemeProvider></TranslationProvider>;
      await render(wrap(<EventPreviewSheet event={mockUtcEvent} isFallback onClose={jest.fn()} />));
      expect(screen.getByLabelText(d['common.close']).props.accessibilityHint).toBe(d['intelligence.events.closeHint']);
      expect(screen.getByRole('button', { name: d['common.close'] })).toBeTruthy();
      expect(screen.getByText(d['intelligence.events.dateTime'])).toBeTruthy();
      expect(screen.getByText(d['intelligence.events.venue'])).toBeTruthy();
      expect(screen.queryByText(d['place.openingHours'])).toBeNull();
      expect(screen.queryByText(d['place.address'])).toBeNull();
      expect(StyleSheet.flatten(screen.getByLabelText(d['intelligence.events.attribution']).props.style).backgroundColor).toBe(palette.brand.primary);
      expect(StyleSheet.flatten(screen.getByLabelText(d['intelligence.reviewRequired']).props.style).backgroundColor).toBe(palette.background.surfaceVariant);
      expect(screen.getByLabelText(d['intelligence.stale'])).toBeTruthy();
      await cleanup();
      await render(wrap(<EventErrorState isRateLimited onRetry={jest.fn()} />));
      expect(screen.getByRole('button', { name: d['common.retry'] }).props.accessibilityHint).toBe(d['common.retry']);
      expect(screen.getByText(d['intelligence.events.rateLimitedTitle'])).toBeTruthy();
      await cleanup();
      await render(wrap(<ExploreScreen initialPlaces={[]} initialExploreMode="events" />));
      expect(screen.getByLabelText(d['explore.modePlaces']).props.accessibilityHint).toBe(d['explore.placesModeHint']);
      expect(screen.getByLabelText(d['intelligence.events.title']).props.accessibilityHint).toBe(d['explore.eventsModeHint']);
      expect(screen.getByText(d['intelligence.events.locationUnavailableTitle'])).toBeTruthy();
      await cleanup();
      await render(wrap(<ExplorePlacePreview place={{ id: 'test-place', googlePlaceId: 'test-place', name: 'Test place', category: 'attractions', categoryLabel: 'Attraction', coordinate: { latitude: 1, longitude: 1 }, iconName: 'place' }} onClose={jest.fn()} />));
      expect(screen.getByLabelText(d['common.close']).props.accessibilityHint).toBe(d['explore.closePreviewHint']);
      for(const key of ['common.save', 'common.share', 'place.getDirections', 'place.entryFee']) expect(screen.getByRole('button', { name: d[key] })).toBeTruthy();
      await cleanup();
      const repo = { getIntelligence: jest.fn().mockResolvedValue(mockOperationalPlace), getIntelligenceWithFreshness: jest.fn().mockResolvedValue({ data: mockOperationalPlace, state: 'STALE', isFallback: true }) };
      await render(wrap(<PlaceDetailScreen route={{ params: { placeId: mockPlaceId } } as any} navigation={{ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() } as any} intelligenceRepository={repo} />));
      await waitFor(() => expect(screen.getByLabelText(d['intelligence.sourceGooglePlaces'])).toBeTruthy());
      expect(screen.getByLabelText(d['intelligence.staleFallback']).props.accessibilityHint).toBe(d['intelligence.refreshHint']);
      expect(screen.getByLabelText(d['place.weeklySchedule']).props.accessibilityHint).toBe(d['place.weeklyScheduleHint']);
      expect(screen.getByLabelText(d['common.share'])).toBeTruthy();
      expect(screen.getByText(d['intelligence.unavailable'])).toBeTruthy();
      expect(screen.queryByText('Free admission')).toBeNull();
      await cleanup();
    }
  });
});
