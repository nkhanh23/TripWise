export type SearchDestinationsRequest = {
  query: string;
};

export type DestinationResult = {
  googlePlaceId: string;
  name: string;
  formattedAddress: string;
  destinationType: 'CITY' | 'COUNTRY';
  latitude?: number;
  longitude?: number;
};

export type SearchDestinationsSuccessResponse = {
  data: DestinationResult[];
};

export type SearchDestinationsErrorResponse = {
  error: { code: string; message: string };
};

