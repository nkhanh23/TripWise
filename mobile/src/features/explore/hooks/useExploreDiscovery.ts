import { useCallback, useEffect, useRef, useState } from 'react';

import type { ExploreDiscoveredPlace } from '../../../integration/contracts';
import type { ExplorePlacesRepository } from '../../../integration/repositories';
import type { ExploreMapRegion, ExploreRegionChangeDetails } from '../components/ExploreMapCanvas';
import { INITIAL_EXPLORE_REGION } from '../components/ExploreMapCanvas';
import type { DiscoveredExplorePlace, ExploreCategory, ExploreMapPlace, ExplorePlace, ExploreUIStatus } from '../types';

const DEBOUNCE_MS = 400;
const MAX_RADIUS_METERS = 5_000;

const icons: Record<Exclude<ExploreCategory, 'all'>, ExploreMapPlace['iconName']> = {
  attractions: 'attractions',
  restaurants: 'restaurant',
  hotels: 'hotel',
  coffee: 'local-cafe',
  shopping: 'shopping-bag',
};

function normalizeInitialStatus(initialStatus: ExploreUIStatus): ExploreUIStatus {
  return initialStatus === 'loading' ? 'initial-loading' : initialStatus;
}

function toExplorePlace(place: ExploreDiscoveredPlace): DiscoveredExplorePlace {
  return {
    id: place.googlePlaceId,
    googlePlaceId: place.googlePlaceId,
    name: place.name,
    coordinate: place.coordinate,
    category: place.category,
    categoryLabel: place.categoryLabel,
    iconName: icons[place.category],
    ...(place.address === undefined ? {} : { address: place.address }),
    ...(place.rating === undefined ? {} : { rating: place.rating }),
    ...(place.userRatingCount === undefined ? {} : { reviewCount: place.userRatingCount }),
  };
}

function requestFor(region: ExploreMapRegion, category: ExploreCategory) {
  const latitudeMeters = Math.abs(region.latitudeDelta) * 111_000 / 2;
  const longitudeMeters =
    Math.abs(region.longitudeDelta) * 111_000 * Math.cos(region.latitude * Math.PI / 180) / 2;
  const radiusMeters = Math.max(100, Math.min(MAX_RADIUS_METERS, Math.hypot(latitudeMeters, longitudeMeters)));
  return {
    center: { latitude: region.latitude, longitude: region.longitude },
    radiusMeters: Math.round(radiusMeters),
    category,
    limit: 12,
  } as const;
}

function requestKey(region: ExploreMapRegion, category: ExploreCategory) {
  const request = requestFor(region, category);
  const radiusBucket = Math.round(request.radiusMeters / 50) * 50;
  return `${request.center.latitude.toFixed(4)}:${request.center.longitude.toFixed(4)}:${radiusBucket}:${category}`;
}

function hasEquivalentCenter(left: ExploreMapRegion, right: ExploreMapRegion) {
  return Math.abs(left.latitude - right.latitude) < 0.0001 && Math.abs(left.longitude - right.longitude) < 0.0001;
}

export function useExploreDiscovery(
  repository: ExplorePlacesRepository | undefined,
  fixturePlaces: ExplorePlace[] | undefined,
  initialStatus: ExploreUIStatus,
) {
  const fixtureMode = repository === undefined && fixturePlaces !== undefined;
  const normalizedInitialStatus = normalizeInitialStatus(initialStatus);
  const initialPlaces = fixturePlaces ?? [];
  const [places, setPlaces] = useState<ExploreMapPlace[]>(initialPlaces);
  const [status, setStatus] = useState<ExploreUIStatus>(
    fixtureMode ? normalizedInitialStatus : 'initial-loading'
  );
  const [category, setCategoryState] = useState<ExploreCategory>('all');
  const [confirmedCategory, setConfirmedCategory] = useState<ExploreCategory>('all');
  const [hasBackgroundError, setHasBackgroundError] = useState(false);
  const regionRef = useRef<ExploreMapRegion>(INITIAL_EXPLORE_REGION);
  const [retryKey, setRetryKey] = useState(0);
  const sequence = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authoritativeRequestKeyRef = useRef<string | null>(null);
  const activeRequestKeyRef = useRef<string | null>(null);
  const pendingRequestKeyRef = useRef<string | null>(null);
  const forceNextLoadRef = useRef(false);
  const initialSettlePendingRef = useRef(true);
  const placesRef = useRef<ExploreMapPlace[]>(initialPlaces);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  const clearPendingLoad = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingRequestKeyRef.current = null;
  }, []);

  const invalidateActiveRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    activeRequestKeyRef.current = null;
    sequence.current += 1;
  }, []);

  const load = useCallback(
    async (nextRegion: ExploreMapRegion, nextCategory: ExploreCategory, force = false) => {
      if (!repository) return;
      const nextRequestKey = requestKey(nextRegion, nextCategory);
      if (!force) {
        if (activeRequestKeyRef.current === nextRequestKey) return;
        if (authoritativeRequestKeyRef.current === nextRequestKey) return;
      }
      clearPendingLoad();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestSequence = ++sequence.current;
      activeRequestKeyRef.current = nextRequestKey;
      setHasBackgroundError(false);
      setStatus(placesRef.current.length > 0 ? 'refreshing' : 'initial-loading');
      if (__DEV__) console.info('[ExploreDiscovery] request', { category: nextCategory, limit: 12 });
      try {
        const result = await repository.discover(requestFor(nextRegion, nextCategory), controller.signal);
        if (controller.signal.aborted || requestSequence !== sequence.current) return;
        const nextPlaces = result.map(toExplorePlace);
        placesRef.current = nextPlaces;
        setPlaces(nextPlaces);
        setConfirmedCategory(nextCategory);
        authoritativeRequestKeyRef.current = nextRequestKey;
        activeRequestKeyRef.current = null;
        setStatus('ready');
        if (__DEV__) console.info('[ExploreDiscovery] success', { category: nextCategory, places: result.length });
      } catch {
        if (controller.signal.aborted || requestSequence !== sequence.current) return;
        activeRequestKeyRef.current = null;
        if (placesRef.current.length > 0) {
          setHasBackgroundError(true);
          setStatus('ready');
          return;
        }
        setStatus('error');
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [clearPendingLoad, repository]
  );

  useEffect(() => {
    if (!repository) return;
    clearPendingLoad();
    const force = forceNextLoadRef.current;
    forceNextLoadRef.current = false;
    void load(regionRef.current, category, force);
  }, [category, clearPendingLoad, load, repository, retryKey]);

  useEffect(
    () => () => {
      clearPendingLoad();
      invalidateActiveRequest();
    },
    [clearPendingLoad, invalidateActiveRequest]
  );

  const setCategory = useCallback(
    (next: ExploreCategory) => {
      if (next === category) return;
      if (fixtureMode) {
        setCategoryState(next);
        setConfirmedCategory(next);
        return;
      }
      clearPendingLoad();
      invalidateActiveRequest();
      setHasBackgroundError(false);
      setStatus(placesRef.current.length > 0 ? 'refreshing' : 'initial-loading');
      setCategoryState(next);
    },
    [category, clearPendingLoad, fixtureMode, invalidateActiveRequest]
  );

  const onRegionChangeComplete = useCallback(
    (nextRegion: ExploreMapRegion, details?: ExploreRegionChangeDetails) => {
      if (!repository || !Number.isFinite(nextRegion.latitude) || !Number.isFinite(nextRegion.longitude)) return;
      regionRef.current = nextRegion;
      if (initialSettlePendingRef.current) {
        initialSettlePendingRef.current = false;
        if (hasEquivalentCenter(nextRegion, INITIAL_EXPLORE_REGION) && details?.isGesture !== true) return;
      }
      const nextRequestKey = requestKey(nextRegion, category);
      if (pendingRequestKeyRef.current === nextRequestKey) return;
      if (activeRequestKeyRef.current === nextRequestKey) return;
      if (authoritativeRequestKeyRef.current === nextRequestKey) {
        clearPendingLoad();
        return;
      }
      clearPendingLoad();
      invalidateActiveRequest();
      pendingRequestKeyRef.current = nextRequestKey;
      const capturedCategory = category;
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        if (pendingRequestKeyRef.current !== nextRequestKey) return;
        pendingRequestKeyRef.current = null;
        void load(nextRegion, capturedCategory);
      }, DEBOUNCE_MS);
    },
    [category, clearPendingLoad, invalidateActiveRequest, load, repository]
  );

  const retry = useCallback(() => {
    if (fixtureMode) {
      setStatus('ready');
      setHasBackgroundError(false);
      return;
    }
    clearPendingLoad();
    invalidateActiveRequest();
    forceNextLoadRef.current = true;
    setHasBackgroundError(false);
    setRetryKey((value) => value + 1);
  }, [clearPendingLoad, fixtureMode, invalidateActiveRequest]);

  return {
    places,
    status,
    category,
    confirmedCategory,
    hasBackgroundError,
    setCategory,
    onRegionChangeComplete,
    retry,
  };
}
