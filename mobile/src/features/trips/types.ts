import type MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type TripStatus = 'upcoming' | 'past';

export type TravelerAvatar = {
  id: string;
  name: string;
  initials: string;
  colorVariant: 'secondary' | 'tertiary';
  avatarUrl?: string;
};

export type TripSummary = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  dateLabel: string;
  status: TripStatus;
  statusBadgeText?: string;
  statusBadgeVariant?: 'primary' | 'surface';
  travelers?: TravelerAvatar[];
  actionLabel?: string;
};

export type TripSectionData = {
  type: TripStatus;
  title: string;
  iconName: 'flight-takeoff' | 'history';
  iconColor: string;
  data: TripSummary[];
};

export type TripsUIStatus = 'loading' | 'ready' | 'error' | 'empty';

export type ItineraryItemType = 'place' | 'activity' | 'restaurant' | 'transport' | 'note';

export type ItineraryItem = {
  id: string;
  type: ItineraryItemType;
  time: string; // e.g. "09:00"
  timePeriod?: 'AM' | 'PM';
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  iconBgVariant?: 'primary' | 'secondary' | 'tertiary';
  placeId?: string;
  durationMinutes?: number;
  durationLabel?: string;
  location?: string;
  directionsLabel?: string;
};

export type TransportSegment = {
  id: string;
  mode: 'walk' | 'drive' | 'transit';
  durationLabel: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
};

export type TripDayItinerary = {
  id: string;
  dayNumber: number;
  date: string;
  dateLabel: string; // e.g. "Day 1 • Oct 12"
  title?: string;
  items: ItineraryItem[];
};

export type TripDetailData = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  dateLabel: string; // e.g. "Oct 12 - Oct 18 • 6 Days"
  durationDays: number;
  heroImageUrl: string;
  budgetSpent: string; // "$1,200"
  budgetTotal: string; // "$1,500"
  budgetPercent: number; // 80
  travelers: TravelerAvatar[];
  savedPlacesCount: number; // 14
  days: TripDayItinerary[];
};

export type TripDetailUIStatus = 'loading' | 'ready' | 'error' | 'not_found' | 'empty';
