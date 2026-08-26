import type MaterialIcons from '@expo/vector-icons/MaterialIcons';

import type { Coordinate, ExploreCategory as IntegrationExploreCategory } from '../../integration/contracts';

export type ExploreCategory = IntegrationExploreCategory;

export type ExploreViewMode = 'map' | 'list';

export type CategoryOption = {
  id: ExploreCategory;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
};

type ExplorePlaceBase = {
  id: string;
  name: string;
  category: ExploreCategory;
  categoryLabel: string;
  coordinate: Coordinate;
  iconName: keyof typeof MaterialIcons.glyphMap;
};

export type ExplorePlace = ExplorePlaceBase & {
  rating: number;
  reviewCount: number;
  address: string;
  openStatus: string;
  description: string;
  imageUrl: string;
  fixtureMapCoordinate: { topPercent: number; leftPercent: number };
};

export type DiscoveredExplorePlace = ExplorePlaceBase & {
  googlePlaceId: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  openStatus?: string;
  description?: string;
  imageUrl?: string;
};

export type ExploreMapPlace = ExplorePlace | DiscoveredExplorePlace;

export type SinglePlaceMarker = {
  type: 'place';
  id: string;
  place: ExploreMapPlace;
};

export type ClusterMarkerModel = {
  type: 'cluster';
  id: string;
  count: number;
  places: ExploreMapPlace[];
  coordinate: Coordinate;
};

export type ExploreMarkerItem = SinglePlaceMarker | ClusterMarkerModel;

export type ExploreUIStatus = 'loading' | 'ready' | 'error' | 'empty';
