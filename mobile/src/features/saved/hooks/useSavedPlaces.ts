import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ResolvedImage, SavedPlace } from '../../../integration/contracts';
import { CompositePlaceImageRepository, maximumConcurrentImageRequests } from '../../../integration/imageResolution';
import type { PlaceImageRepository, PlacePhotoRepository, SavedPlacesRepository, PlaceMetadataRepository } from '../../../integration/repositories';
import { SupabasePlacePhotoRepository } from '../../../integration/remote/supabasePlacePhotoRepository';
import { SupabaseSavedPlacesRepository } from '../../../integration/remote/supabaseSavedPlacesRepository';
import { SupabasePlaceMetadataRepository } from '../../../integration/remote/supabasePlaceMetadataRepository';
import { SupabaseWikimediaImageRepository } from '../../../integration/remote/supabaseWikimediaImageRepository';
import { supabase } from '../../../lib/supabase/client';
import {
  getSavedPlaces,
  restorePlace as restoreFixturePlace,
  subscribeToSavedPlaces,
  unsavePlace as unsaveFixturePlace,
} from '../data/savedPlacesStore';
import { mapSavedPlaceToUIItem } from '../integrationMappers';
import type { SavedPlacesUIStatus, SavedPlaceUIItem } from '../types';
import type { ExplorePlace } from '../../explore/types';

export type SavedPlaceFixtureInput = SavedPlaceUIItem | ExplorePlace;
export const maximumConcurrentMetadataRequests = 3;

function normalizeCustomPlace(p: SavedPlaceFixtureInput): SavedPlaceUIItem {
  const isSavedPlace = 'googlePlaceId' in p;
  return {
    id: p.id,
    googlePlaceId: isSavedPlace ? p.googlePlaceId : p.id,
    name: p.name,
    latitude: isSavedPlace ? p.latitude : 0,
    longitude: isSavedPlace ? p.longitude : 0,
    address: p.address || '',
    category: p.category || 'all',
    categoryLabel: p.categoryLabel || 'Place',
    imageUrl: p.imageUrl,
    rating: p.rating,
    createdAt: isSavedPlace ? p.createdAt : new Date().toISOString(),
  };
}

export type UseSavedPlacesOptions = {
  customPlaces?: SavedPlaceFixtureInput[];
  repository?: SavedPlacesRepository;
  photoRepository?: PlacePhotoRepository;
  placeImageRepository?: PlaceImageRepository;
  metadataRepository?: PlaceMetadataRepository;
  fixtureMode?: boolean;
};

export function useSavedPlaces({
  customPlaces,
  repository,
  photoRepository,
  placeImageRepository,
  metadataRepository,
  fixtureMode,
}: UseSavedPlacesOptions = {}) {
  const normalizedCustomPlaces = useMemo(() => {
    return customPlaces ? customPlaces.map(normalizeCustomPlace) : undefined;
  }, [customPlaces]);

  const isFixture = Boolean(fixtureMode);

  const effectiveRepository = useMemo(() => {
    if (normalizedCustomPlaces || isFixture) return repository;
    return repository ?? new SupabaseSavedPlacesRepository(supabase);
  }, [normalizedCustomPlaces, isFixture, repository]);

  const effectiveMetadataRepository = useMemo(() => {
    if (normalizedCustomPlaces || isFixture) return metadataRepository;
    return metadataRepository ?? new SupabasePlaceMetadataRepository(supabase);
  }, [normalizedCustomPlaces, isFixture, metadataRepository]);

  const effectivePhotoRepository = useMemo(() => {
    if (normalizedCustomPlaces || isFixture) return photoRepository;
    return photoRepository ?? new SupabasePlacePhotoRepository(supabase);
  }, [normalizedCustomPlaces, isFixture, photoRepository]);
  const effectivePlaceImageRepository = useMemo(() => {
    if (normalizedCustomPlaces || isFixture) return placeImageRepository;
    if (placeImageRepository) return placeImageRepository;
    const google = effectivePhotoRepository ?? new SupabasePlacePhotoRepository(supabase);
    return new CompositePlaceImageRepository(google, new SupabaseWikimediaImageRepository(supabase));
  }, [effectivePhotoRepository, isFixture, normalizedCustomPlaces, placeImageRepository]);

  const [fixturePlaces, setFixturePlaces] = useState<SavedPlaceUIItem[]>(() =>
    isFixture ? getSavedPlaces().map(normalizeCustomPlace) : []
  );

  const [remotePlaces, setRemotePlaces] = useState<SavedPlaceUIItem[]>([]);
  const [status, setStatus] = useState<SavedPlacesUIStatus>(() => {
    if (normalizedCustomPlaces) {
      return normalizedCustomPlaces.length > 0 ? 'ready' : 'empty';
    }
    if (isFixture) {
      return getSavedPlaces().length > 0 ? 'ready' : 'empty';
    }
    return 'loading';
  });

  const [resolvedImages, setResolvedImages] = useState<Record<string, ResolvedImage>>({});
  const resolvedImageKeys = useRef(new Set<string>());
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const ratingsRef = useRef<Record<string, number>>({});
  const metadataKeysInFlight = useRef(new Map<string, AbortSignal>());
  const [lastRemovedPlace, setLastRemovedPlace] = useState<{
    item: SavedPlaceUIItem;
    index: number;
  } | null>(null);

  const activeController = useRef<AbortController | null>(null);

  const loadMetadataBounded = useCallback(async (places: SavedPlace[], signal: AbortSignal) => {
    if (!effectiveMetadataRepository) return;
    const pending = places.filter((place) => {
      const key = place.googlePlaceId;
      const existingSignal = metadataKeysInFlight.current.get(key);
      if (ratingsRef.current[key] !== undefined || (existingSignal && !existingSignal.aborted)) return false;
      metadataKeysInFlight.current.set(key, signal);
      return true;
    });
    const resolved: Record<string, number> = {};
    let nextIndex = 0;
    const worker = async () => {
      while (!signal.aborted) {
        const place = pending[nextIndex];
        nextIndex += 1;
        if (!place) return;
        try {
          const metadata = await effectiveMetadataRepository.getMetadata(place.googlePlaceId, signal);
          if (metadata.rating !== undefined && !signal.aborted) {
            resolved[place.googlePlaceId] = metadata.rating;
          }
        } catch {
          // Metadata is optional and must not block the saved-place shell.
        } finally {
          if (metadataKeysInFlight.current.get(place.googlePlaceId) === signal) {
            metadataKeysInFlight.current.delete(place.googlePlaceId);
          }
        }
      }
    };
    const workerCount = Math.min(maximumConcurrentMetadataRequests, pending.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
    pending.forEach((place) => {
      if (metadataKeysInFlight.current.get(place.googlePlaceId) === signal) {
        metadataKeysInFlight.current.delete(place.googlePlaceId);
      }
    });
    if (!signal.aborted && Object.keys(resolved).length > 0) {
      setRatings((current) => {
        const next = { ...current, ...resolved };
        ratingsRef.current = next;
        return next;
      });
    }
  }, [effectiveMetadataRepository]);

  const loadImagesBounded = useCallback(async (places: SavedPlace[], signal: AbortSignal) => {
    if (!effectivePlaceImageRepository) return;
    let nextIndex = 0;
    const worker = async () => {
      while (!signal.aborted) {
        const place = places[nextIndex];
        nextIndex += 1;
        if (!place) return;
        if (resolvedImageKeys.current.has(place.googlePlaceId)) continue;
        resolvedImageKeys.current.add(place.googlePlaceId);
        const image = await effectivePlaceImageRepository
          .getPlaceImage({ googlePlaceId: place.googlePlaceId, maxWidth: 800 }, signal)
          .catch(() => null);
        if (image?.uri && !signal.aborted) {
          setResolvedImages((current) => ({ ...current, [place.googlePlaceId]: image }));
        } else if (!signal.aborted) {
          resolvedImageKeys.current.delete(place.googlePlaceId);
        }
      }
    };
    const workers = Math.min(maximumConcurrentImageRequests, places.length);
    await Promise.all(Array.from({ length: workers }, worker));
  }, [effectivePlaceImageRepository]);

  useEffect(() => {
    if (isFixture) {
      const unsubscribe = subscribeToSavedPlaces(() => {
        const updated = getSavedPlaces().map(normalizeCustomPlace);
        setFixturePlaces(updated);
        setStatus(updated.length > 0 ? 'ready' : 'empty');
      });
      return unsubscribe;
    }
  }, [isFixture]);

  const loadSavedPlaces = useCallback(async () => {
    if (normalizedCustomPlaces || isFixture) {
      return;
    }

    if (!effectiveRepository) {
      setStatus('empty');
      return;
    }

    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;

    setStatus('loading');

    try {
      const page = await effectiveRepository.listSavedPlaces(undefined, controller.signal);
      if (controller.signal.aborted) return;

      const uiItems = page.items.map((item: SavedPlace) => mapSavedPlaceToUIItem(item));
      setRemotePlaces(uiItems);
      setStatus(uiItems.length === 0 ? 'empty' : 'ready');

      void loadMetadataBounded(page.items, controller.signal);

      // Fetch photos in background for items missing photos
      void loadImagesBounded(page.items, controller.signal);
    } catch {
      if (!controller.signal.aborted) {
        setStatus('error');
      }
    }
  }, [normalizedCustomPlaces, isFixture, effectiveRepository, loadImagesBounded, loadMetadataBounded]);

  useEffect(() => {
    if (normalizedCustomPlaces || isFixture) {
      return;
    }

    const controller = new AbortController();
    activeController.current = controller;

    async function initialFetch() {
      if (!effectiveRepository) {
        setStatus('empty');
        return;
      }

      try {
        const page = await effectiveRepository.listSavedPlaces(undefined, controller.signal);
        if (controller.signal.aborted) return;

        const uiItems = page.items.map((item: SavedPlace) => mapSavedPlaceToUIItem(item));
        setRemotePlaces(uiItems);
        setStatus(uiItems.length === 0 ? 'empty' : 'ready');

        void loadMetadataBounded(page.items, controller.signal);

        void loadImagesBounded(page.items, controller.signal);
      } catch {
        if (!controller.signal.aborted) {
          setStatus('error');
        }
      }
    }

    void initialFetch();

    return () => {
      controller.abort();
    };
  }, [normalizedCustomPlaces, isFixture, effectiveRepository, loadImagesBounded, loadMetadataBounded]);

  const activePlaces = normalizedCustomPlaces ?? (isFixture ? fixturePlaces : remotePlaces);

  // Combine items with cached photo URLs
  const itemsWithRichData: SavedPlaceUIItem[] = useMemo(() => {
    return activePlaces.map((item) => ({
      ...item,
      imageUrl: resolvedImages[item.googlePlaceId]?.uri ?? item.imageUrl,
      resolvedImage: resolvedImages[item.googlePlaceId] ?? item.resolvedImage,
      rating: ratings[item.googlePlaceId] ?? item.rating,
    }));
  }, [activePlaces, ratings, resolvedImages]);

  const handleUnsave = useCallback(
    async (idOrGooglePlaceId: string) => {
      const targetIndex = activePlaces.findIndex(
        (p) => p.id === idOrGooglePlaceId || p.googlePlaceId === idOrGooglePlaceId
      );
      if (targetIndex === -1) return;

      const targetPlace = activePlaces[targetIndex];

      if (isFixture) {
        const { removedPlace } = unsaveFixturePlace(targetPlace.id);
        if (removedPlace) {
          setLastRemovedPlace({ item: targetPlace, index: targetIndex });
        }
        return;
      }

      // Optimistic removal
      setRemotePlaces((prev) => prev.filter((_, idx) => idx !== targetIndex));
      setLastRemovedPlace({ item: targetPlace, index: targetIndex });

      if (effectiveRepository) {
        try {
          await effectiveRepository.unsavePlace(targetPlace.googlePlaceId);
        } catch {
          // If remote fails, rollback
          setRemotePlaces((prev) => {
            const restored = [...prev];
            restored.splice(targetIndex, 0, targetPlace);
            return restored;
          });
          setLastRemovedPlace(null);
        }
      }
    },
    [activePlaces, isFixture, effectiveRepository]
  );

  const handleUndo = useCallback(async () => {
    if (!lastRemovedPlace) return;

    const { item, index } = lastRemovedPlace;
    setLastRemovedPlace(null);

    if (isFixture) {
      restoreFixturePlace(item.id, index);
      return;
    }

    // Optimistic restoration
    setRemotePlaces((prev) => {
      const copy = [...prev];
      copy.splice(Math.min(index, copy.length), 0, item);
      return copy;
    });

    if (effectiveRepository) {
      try {
        await effectiveRepository.savePlace({
          googlePlaceId: item.googlePlaceId,
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          address: item.address,
        });
      } catch {
        // If undo fails, remove again
        setRemotePlaces((prev) => prev.filter((p) => p.googlePlaceId !== item.googlePlaceId));
      }
    }
  }, [lastRemovedPlace, isFixture, effectiveRepository]);

  const dismissUndo = useCallback(() => {
    setLastRemovedPlace(null);
  }, []);

  const handleToggleSave = useCallback(
    (idOrGooglePlaceId: string) => {
      void handleUnsave(idOrGooglePlaceId);
    },
    [handleUnsave]
  );

  return {
    savedPlaces: itemsWithRichData,
    status: normalizedCustomPlaces
      ? normalizedCustomPlaces.length > 0
        ? 'ready'
        : 'empty'
      : status,
    handleUnsave,
    handleToggleSave,
    handleUndo,
    dismissUndo,
    refresh: loadSavedPlaces,
    lastRemovedPlace: lastRemovedPlace?.item ?? null,
    undoAvailable: lastRemovedPlace !== null,
  };
}
