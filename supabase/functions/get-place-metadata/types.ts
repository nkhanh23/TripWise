export const PLACE_BUSINESS_STATUSES = [
  'OPERATIONAL',
  'CLOSED_TEMPORARILY',
  'CLOSED_PERMANENTLY',
  'UNKNOWN',
] as const;

export type PlaceBusinessStatus = typeof PLACE_BUSINESS_STATUSES[number];

export type PlaceTimePoint = {
  day: number;
  hour: number;
  minute: number;
};

export type PlaceOpeningPeriod = {
  open: PlaceTimePoint;
  close?: PlaceTimePoint;
};

export type PlaceOpeningHours = {
  periods: PlaceOpeningPeriod[];
  weekdayDescriptions: string[];
  openNow?: boolean;
};

export type PlaceMetadataResult = {
  googlePlaceId: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus: PlaceBusinessStatus;
  openingHours: PlaceOpeningHours | null;
  utcOffsetMinutes?: number;
  provenance: {
    provider: 'google-places';
    boundary: 'get-place-metadata';
    fetchedAt: string;
  };
};

export type PlaceMetadataRequest = {
  googlePlaceId: string;
};

export type PlaceMetadataResponseEnvelope = {
  data: PlaceMetadataResult;
};
