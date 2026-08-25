import type MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type ExploreCategory =
  "all" | "attractions" | "restaurants" | "hotels" | "coffee" | "shopping";

export type ExploreViewMode = "map" | "list";

export type CategoryOption = {
  id: ExploreCategory;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
};

export type ExplorePlace = {
  id: string;
  name: string;
  category: ExploreCategory;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  address: string;
  openStatus: string;
  description: string;
  imageUrl: string;
  mapCoordinate: {
    topPercent: number;
    leftPercent: number;
  };
  iconName: keyof typeof MaterialIcons.glyphMap;
};

export type SinglePlaceMarker = {
  type: "place";
  id: string;
  place: ExplorePlace;
};

export type ClusterMarkerModel = {
  type: "cluster";
  id: string;
  count: number;
  places: ExplorePlace[];
  mapCoordinate: {
    topPercent: number;
    leftPercent: number;
  };
};

export type ExploreMarkerItem = SinglePlaceMarker | ClusterMarkerModel;

export type ExploreUIStatus = "loading" | "ready" | "error" | "empty";
