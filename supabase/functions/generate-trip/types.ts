export type GenerateTripRequest = {
  destination: string;
  startDate: string;
  endDate: string;
  travelers?: number;
  budget?: number;
  currency?: string;
  preferences?: string[];
  notes?: string;
};

export type GeneratedTripItem = {
  position: number;
  placeName: string;
  placeQuery?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  estimatedCost?: number;
};

export type GeneratedTripDay = {
  dayNumber: number;
  date: string;
  summary?: string;
  items: GeneratedTripItem[];
};

export type GeneratedTrip = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  summary?: string;
  days: GeneratedTripDay[];
};

export type GenerateTripErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE'
  | 'INTERNAL_ERROR';

export type GenerateTripErrorResponse = {
  error: {
    code: GenerateTripErrorCode;
    message: string;
  };
};

export type GenerateTripSuccessResponse = { data: GeneratedTrip };
