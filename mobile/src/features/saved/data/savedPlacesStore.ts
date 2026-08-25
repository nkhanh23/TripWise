import { mockExplorePlaces } from "../../explore/data/mockPlaces";
import type { ExplorePlace } from "../../explore/types";

export const INITIAL_SAVED_PLACE_IDS = [
  "place_wat_arun",
  "place_iconsiam",
  "place_thip_samai",
  "place_grand_palace",
];

// In-memory persistent array for active session
let currentSavedPlaceIds: string[] = [...INITIAL_SAVED_PLACE_IDS];
let listeners: (() => void)[] = [];

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeToSavedPlaces(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getSavedPlaceIds(): string[] {
  return [...currentSavedPlaceIds];
}

export function isPlaceSaved(placeId: string): boolean {
  return currentSavedPlaceIds.includes(placeId);
}

export function getSavedPlaces(): ExplorePlace[] {
  return currentSavedPlaceIds
    .map((id) => mockExplorePlaces.find((p) => p.id === id))
    .filter((p): p is ExplorePlace => p !== undefined);
}

export function savePlace(placeId: string): void {
  if (!currentSavedPlaceIds.includes(placeId)) {
    currentSavedPlaceIds = [placeId, ...currentSavedPlaceIds];
    notifyListeners();
  }
}

export function unsavePlace(placeId: string): {
  placeId: string;
  priorIndex: number;
  removedPlace?: ExplorePlace;
} {
  const priorIndex = currentSavedPlaceIds.indexOf(placeId);
  const removedPlace = mockExplorePlaces.find((p) => p.id === placeId);
  if (priorIndex !== -1) {
    currentSavedPlaceIds = currentSavedPlaceIds.filter((id) => id !== placeId);
    notifyListeners();
  }
  return { placeId, priorIndex, removedPlace };
}

export function restorePlace(placeId: string, priorIndex?: number): void {
  if (!currentSavedPlaceIds.includes(placeId)) {
    const next = [...currentSavedPlaceIds];
    if (
      priorIndex !== undefined &&
      priorIndex >= 0 &&
      priorIndex <= next.length
    ) {
      next.splice(priorIndex, 0, placeId);
    } else {
      next.unshift(placeId);
    }
    currentSavedPlaceIds = next;
    notifyListeners();
  }
}

export function resetSavedPlaces(): void {
  currentSavedPlaceIds = [...INITIAL_SAVED_PLACE_IDS];
  notifyListeners();
}

export function clearAllSavedPlaces(): void {
  currentSavedPlaceIds = [];
  notifyListeners();
}

export function setSavedPlaceIds(ids: string[]): void {
  currentSavedPlaceIds = [...ids];
  notifyListeners();
}

export function getLargeMockSavedPlaces(count: number = 40): ExplorePlace[] {
  const result: ExplorePlace[] = [];
  const basePlaces = mockExplorePlaces;
  for (let i = 0; i < count; i++) {
    const base = basePlaces[i % basePlaces.length];
    result.push({
      ...base,
      id: `saved_virtual_${i + 1}`,
      name: `${base.name} #${i + 1}`,
    });
  }
  return result;
}
