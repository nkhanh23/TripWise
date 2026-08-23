import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SavedPlace } from '../../../integration/contracts';
import type { PlacePhotoRepository, SavedPlacesRepository, PlaceMetadataRepository } from '../../../integration/repositories';
import { SupabasePlacePhotoRepository } from '../../../integration/remote/supabasePlacePhotoRepository';
import { SupabaseSavedPlacesRepository } from '../../../integration/remote/supabaseSavedPlacesRepository';
import { SupabasePlaceMetadataRepository } from '../../../integration/remote/supabasePlaceMetadataRepository';
import { supabase } from '../../../lib/supabase/client';
import {
  getSavedPlaces,
  restorePlace as restoreFixturePlace,
  subscribeToSavedPlaces,
  unsavePlace as unsaveFixturePlace,
} from '../data/savedPlacesStore';
import { mapSavedPlaceToUIItem } from '../integrationMappers';
import type { SavedPlacesUIStatus, SavedPlaceUIItem } from '../types';

function normalizeCustomPlace(p: any): SavedPlaceUIItem {
  return {
    id: p.id,
    googlePlaceId: p.googlePlaceId || p.id,
    name: p.name,
    latitude: typeof p.latitude === 'number' ? p.latitude : 0,
    longitude: typeof p.longitude === 'number' ? p.longitude : 0,
    address: p.address || '',
    category: p.category || 'all',
    categoryLabel: p.categoryLabel || 'Place',
    imageUrl: p.imageUrl,
    rating: p.rating,
    createdAt: p.createdAt || new Date().toISOString(),
  };
}

export type UseSavedPlacesOptions = {
  customPlaces?: SavedPlaceUIItem[];
  repository?: SavedPlacesRepository;
  photoRepository?: PlacePhotoRepository;
  metadataRepository?: PlaceMetadataRepository;
  fixtureMode?: boolean;
};

export function useSavedPlaces({
  customPlaces,
  repository,
  photoRepository,
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

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [lastRemovedPlace, setLastRemovedPlace] = useState<{
    item: SavedPlaceUIItem;
    index: number;
  } | null>(null);

  const activeController = useRef<AbortController | null>(null);

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

      const uiItems = page.items.map((item: SavedPlace) =>
        mapSavedPlaceToUIItem(item, photoUrls[item.googlePlaceId])
      );
      setRemotePlaces(uiItems);
      setStatus(uiItems.length === 0 ? 'empty' : 'ready');

      // Fetch metadata in background
      if (effectiveMetadataRepository) {
        for (const item of page.items) {
          if (ratings[item.googlePlaceId] === undefined) {
            void effectiveMetadataRepository
              .getMetadata(item.googlePlaceId, controller.signal)
              .then((meta) => {
                if (meta.rating !== undefined && !controller.signal.aborted) {
                  setRatings((prev) => ({ ...prev, [item.googlePlaceId]: meta.rating! }));
                }
              })
              .catch(() => {});
          }
        }
      }

      // Fetch photos in background for items missing photos
      if (effectivePhotoRepository) {
        for (const item of page.items) {
          if (!photoUrls[item.googlePlaceId]) {
            void effectivePhotoRepository
              .getPhoto({ googlePlaceId: item.googlePlaceId }, controller.signal)
              .then((photo) => {
                if (photo.photoUri && !controller.signal.aborted) {
                  setPhotoUrls((prev) => ({ ...prev, [item.googlePlaceId]: photo.photoUri! }));
                }
              })
              .catch(() => {
                // Non-blocking: fallback to placeholder
              });
          }
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        setStatus('error');
      }
    }
  }, [normalizedCustomPlaces, isFixture, effectiveRepository, effectiveMetadataRepository, effectivePhotoRepository, photoUrls, ratings]);

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

        if (effectiveMetadataRepository) {
          for (const item of page.items) {
            void effectiveMetadataRepository
              .getMetadata(item.googlePlaceId, controller.signal)
              .then((meta) => {
                if (meta.rating !== undefined && !controller.signal.aborted) {
                  setRatings((prev) => ({ ...prev, [item.googlePlaceId]: meta.rating! }));
                }
              })
              .catch(() => {});
          }
        }

        if (effectivePhotoRepository) {
          for (const item of page.items) {
            void effectivePhotoRepository
              .getPhoto({ googlePlaceId: item.googlePlaceId }, controller.signal)
              .then((photo) => {
                if (photo.photoUri && !controller.signal.aborted) {
                  setPhotoUrls((prev) => ({ ...prev, [item.googlePlaceId]: photo.photoUri! }));
                }
              })
              .catch(() => {
                // Non-blocking
              });
          }
        }
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
  }, [normalizedCustomPlaces, isFixture, effectiveRepository, effectiveMetadataRepository, effectivePhotoRepository]);

  const activePlaces = normalizedCustomPlaces ?? (isFixture ? fixturePlaces : remotePlaces);

  // Combine items with cached photo URLs
  const itemsWithRichData: SavedPlaceUIItem[] = useMemo(() => {
    return activePlaces.map((item) => ({
      ...item,
      imageUrl: photoUrls[item.googlePlaceId] || item.imageUrl,
      rating: ratings[item.googlePlaceId] ?? item.rating,
    }));
  }, [activePlaces, photoUrls, ratings]);

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
