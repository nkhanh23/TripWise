export type WikimediaImageRequest =
  | { kind: 'PLACE'; googlePlaceId: string; maxWidth?: number }
  | { kind: 'DESTINATION'; destination: string; maxWidth?: number };

export type TrustedPlaceContext = {
  placeName: string;
  placeQuery?: string;
  placeAddress?: string;
  destination?: string;
  latitude: number;
  longitude: number;
};

export type WikimediaImageAttribution = {
  displayName: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
};

export type WikimediaImageResult = {
  uri: string | null;
  source: 'WIKIMEDIA_PLACE' | 'DESTINATION_COVER';
  attribution?: WikimediaImageAttribution;
  matchedEntity?: string;
  confidence?: number;
};

export type WikimediaImageSuccessResponse = { data: WikimediaImageResult };
export type WikimediaImageErrorResponse = {
  error: { code: string; message: string };
};
