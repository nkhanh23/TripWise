import type { ResolvedImage } from "../../integration/contracts";

export type HomeUIStatus = "ready" | "loading" | "empty" | "error";

export type UpcomingTripData = {
  id: string;
  title: string;
  dateLabel: string;
  badgeText: string;
  destination: string;
  imageUrl?: string;
  resolvedImage?: ResolvedImage;
};

export type DraftTripData = {
  id: string;
  title: string;
  step: number;
  totalSteps: number;
  statusLabel: string;
};

export type SavedPlaceItem = {
  id: string;
  name: string;
  location: string;
  imageUrl?: string;
};

export type InspirationItem = {
  title: string;
  locationName: string;
  imageUrl?: string;
  actionLabel?: string;
};

export type HomeData = {
  greeting: string;
  subtitle: string;
  upcomingTrip: UpcomingTripData | null;
  draftTrip: DraftTripData | null;
  savedPlaces: SavedPlaceItem[];
  inspiration?: InspirationItem;
};
