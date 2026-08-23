export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Plan: undefined;
  Trips: undefined;
  Saved: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  PlaceDetail: { placeId: string };
  RoutePreview: {
    destinationId: string;
    destinationName?: string;
    originName?: string;
    coordinates?: import('../integration/contracts').Coordinate[];
  };
  CreateTripWizard?: {
    initialStep?: 1 | 2 | 3 | 4 | 5;
  };
  TripDetail: {
    tripId: string;
  };
  AddPlace: {
    tripId: string;
    initialDayId?: string;
  };
  TripMap: {
    tripId: string;
    initialDayId?: string;
  };
  SavedPlaces?: undefined;
  EditProfile?: undefined;
  Settings?: undefined;
  LanguageSettings?: undefined;
  CurrencySettings?: undefined;
  AppearanceSettings?: undefined;
  HelpSupport?: undefined;
};
