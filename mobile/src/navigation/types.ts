export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Plan: undefined;
  Trips: undefined;
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
  };
  CreateTripWizard?: {
    initialStep?: 1 | 2 | 3 | 4 | 5;
  };
  TripDetail: {
    tripId: string;
  };
};
