import type { ExploreCategory } from '../explore/types';

export type SavedPlaceUIItem = {
  id: string;
  googlePlaceId: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  category: ExploreCategory;
  categoryLabel: string;
  imageUrl?: string;
  rating?: number;
  userRatingCount?: number;
  createdAt: string;
};

export type SavedPlacesUIStatus = 'loading' | 'ready' | 'error' | 'empty';
