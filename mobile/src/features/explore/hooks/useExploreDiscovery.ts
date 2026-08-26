import { useCallback, useEffect, useRef, useState } from 'react';

import type { ExploreDiscoveredPlace } from '../../../integration/contracts';
import type { ExplorePlacesRepository } from '../../../integration/repositories';
import type { ExploreMapRegion } from '../components/ExploreMapCanvas';
import { INITIAL_EXPLORE_REGION } from '../components/ExploreMapCanvas';
import type { DiscoveredExplorePlace, ExploreCategory, ExploreMapPlace, ExplorePlace, ExploreUIStatus } from '../types';

const DEBOUNCE_MS = 400;
const MAX_RADIUS_METERS = 5_000;

const icons: Record<Exclude<ExploreCategory, 'all'>, ExploreMapPlace['iconName']> = {
  attractions: 'attractions', restaurants: 'restaurant', hotels: 'hotel', coffee: 'local-cafe', shopping: 'shopping-bag',
};

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
  const longitudeMeters = Math.abs(region.longitudeDelta) * 111_000
    * Math.cos(region.latitude * Math.PI / 180) / 2;
  const radiusMeters = Math.max(100, Math.min(MAX_RADIUS_METERS, Math.hypot(latitudeMeters, longitudeMeters)));
  return {
    center: { latitude: region.latitude, longitude: region.longitude },
    radiusMeters: Math.round(radiusMeters),
    category,
    limit: 12,
  } as const;
}

export function useExploreDiscovery(
  repository: ExplorePlacesRepository | undefined,
  fixturePlaces: ExplorePlace[] | undefined,
  initialStatus: ExploreUIStatus,
) {
  const fixtureMode = repository === undefined && fixturePlaces !== undefined;
  const [places, setPlaces] = useState<ExploreMapPlace[]>(fixturePlaces ?? []);
  const [status, setStatus] = useState<ExploreUIStatus>(fixtureMode ? initialStatus : 'loading');
  const [category, setCategoryState] = useState<ExploreCategory>('all');
  const regionRef = useRef<ExploreMapRegion>(INITIAL_EXPLORE_REGION);
  const [retryKey, setRetryKey] = useState(0);
  const sequence = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (nextRegion: ExploreMapRegion, nextCategory: ExploreCategory) => {
    if (!repository) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestSequence = ++sequence.current;
    setPlaces([]);
    setStatus('loading');
    if (__DEV__) console.info('[ExploreDiscovery] request', { category: nextCategory, limit: 12 });
    try {
      const result = await repository.discover(requestFor(nextRegion, nextCategory), controller.signal);
      if (controller.signal.aborted || requestSequence !== sequence.current) return;
      setPlaces(result.map(toExplorePlace));
      setStatus('ready');
      if (__DEV__) console.info('[ExploreDiscovery] success', { category: nextCategory, places: result.length });
    } catch {
      if (controller.signal.aborted || requestSequence !== sequence.current) return;
      setPlaces([]);
      setStatus('error');
    }
  }, [repository]);

  useEffect(() => {
    if (!repository) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void load(regionRef.current, category);
    return () => abortRef.current?.abort();
  }, [category, load, repository, retryKey]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    sequence.current += 1;
  }, []);

  const setCategory = useCallback((next: ExploreCategory) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setPlaces([]);
    setStatus('loading');
    setCategoryState(next);
  }, []);

  const onRegionChangeComplete = useCallback((nextRegion: ExploreMapRegion) => {
    if (!repository || !Number.isFinite(nextRegion.latitude) || !Number.isFinite(nextRegion.longitude)) return;
    regionRef.current = nextRegion;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    const capturedCategory = category;
    debounceRef.current = setTimeout(() => void load(nextRegion, capturedCategory), DEBOUNCE_MS);
  }, [category, load, repository]);

  const retry = useCallback(() => {
    if (fixtureMode) setStatus('ready');
    else setRetryKey((value) => value + 1);
  }, [fixtureMode]);

  return { places, status, category, setCategory, onRegionChangeComplete, retry };
}
