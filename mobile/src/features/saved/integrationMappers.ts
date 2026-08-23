import type { SavedPlace } from '../../integration/contracts';
import type { ExploreCategory } from '../explore/types';
import type { SavedPlaceUIItem } from './types';

export function mapCategoryToStitch(category: string | null | undefined): {
  category: ExploreCategory;
  categoryLabel: string;
} {
  if (!category) {
    return { category: 'all', categoryLabel: 'Place' };
  }

  const normalized = category.toLowerCase().trim();

  if (
    normalized.includes('cafe') ||
    normalized.includes('coffee') ||
    normalized.includes('bakery')
  ) {
    return { category: 'coffee', categoryLabel: 'Café' };
  }

  if (
    normalized.includes('restaurant') ||
    normalized.includes('food') ||
    normalized.includes('dining') ||
    normalized.includes('meal') ||
    normalized.includes('bar')
  ) {
    return { category: 'restaurants', categoryLabel: 'Food' };
  }

  if (
    normalized.includes('shopping') ||
    normalized.includes('mall') ||
    normalized.includes('store') ||
    normalized.includes('market')
  ) {
    return { category: 'shopping', categoryLabel: 'Shopping' };
  }

  if (
    normalized.includes('hotel') ||
    normalized.includes('lodging') ||
    normalized.includes('resort')
  ) {
    return { category: 'hotels', categoryLabel: 'Hotel' };
  }

  if (
    normalized.includes('attraction') ||
    normalized.includes('culture') ||
    normalized.includes('landmark') ||
    normalized.includes('museum') ||
    normalized.includes('temple') ||
    normalized.includes('park')
  ) {
    return { category: 'attractions', categoryLabel: 'Attractions' };
  }

  return {
    category: 'all',
    categoryLabel: category.charAt(0).toUpperCase() + category.slice(1),
  };
}

export function mapSavedPlaceToUIItem(place: SavedPlace, photoUrl?: string): SavedPlaceUIItem {
  const { category, categoryLabel } = mapCategoryToStitch(place.category);

  return {
    id: place.id,
    googlePlaceId: place.googlePlaceId,
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address || '',
    category,
    categoryLabel: place.category
      ? `${categoryLabel} • ${place.category.charAt(0).toUpperCase() + place.category.slice(1)}`
      : categoryLabel,
    imageUrl: photoUrl,
    createdAt: place.createdAt,
  };
}
