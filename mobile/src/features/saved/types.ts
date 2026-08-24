import type { ExploreCategory } from '../explore/types';
import type { ResolvedImage } from '../../integration/contracts';

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
  resolvedImage?: ResolvedImage;
  rating?: number;
  userRatingCount?: number;
  createdAt: string;
};

export type SavedPlacesUIStatus = 'loading' | 'ready' | 'error' | 'empty';
