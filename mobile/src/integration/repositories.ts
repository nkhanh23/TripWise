import type {
  AuthenticatedSession,
  GenerateTripRequest,
  GeneratedTrip,
  PersistTripCommand,
  Profile,
  ProfileStatistics,
  ProfileUpdate,
  ResolvePlaceRequest,
  ResolvePlaceResult,
  Route,
  RouteRequest,
  SavedTripDetail,
  SavedTripsPage,
  SavedTripsPageRequest,
  TripId,
  ItineraryItemId,
  UserId,
  WeatherForecast,
  WeatherRequest,
  GetPlacePhotoRequest,
  PlacePhoto,
  PlaceImageRequest,
  ResolvedImage,
  TripCoverImageRequest,
  WikimediaImageRequest,
  SavePlaceCommand,
  SavedPlace,
  SavedPlacesPage,
} from './contracts';

export type SignUpResult = {
  session: AuthenticatedSession | null;
  confirmationRequired: boolean;
};

export interface AuthRepository {
  restoreSession(signal?: AbortSignal): Promise<AuthenticatedSession | null>;
  signIn(email: string, password: string, signal?: AbortSignal): Promise<AuthenticatedSession>;
  signUp(displayName: string, email: string, password: string, signal?: AbortSignal): Promise<SignUpResult>;
  resetPassword(email: string, signal?: AbortSignal): Promise<void>;
  signOut(signal?: AbortSignal): Promise<void>;
  deleteAccount(signal?: AbortSignal): Promise<void>;
  subscribe(listener: (session: AuthenticatedSession | null) => void): () => void;
}

export interface ProfileRepository {
  getOwnProfile(userId: UserId, signal?: AbortSignal): Promise<Profile | null>;
  updateOwnProfile(userId: UserId, update: ProfileUpdate, signal?: AbortSignal): Promise<Profile>;
}

export interface TripGenerationRepository {
  generate(request: GenerateTripRequest, signal?: AbortSignal): Promise<GeneratedTrip>;
}

export interface TripPersistenceRepository {
  persist(command: PersistTripCommand, signal?: AbortSignal): Promise<TripId>;
}

export interface SavedTripsRepository {
  list(request?: SavedTripsPageRequest, signal?: AbortSignal): Promise<SavedTripsPage>;
  getDetail(tripId: TripId, signal?: AbortSignal): Promise<SavedTripDetail | null>;
  updateItemNote(itemId: ItineraryItemId, note: string | null, signal?: AbortSignal): Promise<boolean>;
  deleteTrip(tripId: TripId, signal?: AbortSignal): Promise<boolean>;
  getStats(signal?: AbortSignal): Promise<ProfileStatistics>;
}

export interface PlaceResolutionRepository {
  resolve(request: ResolvePlaceRequest, signal?: AbortSignal): Promise<ResolvePlaceResult>;
}

export interface RouteRepository {
  getRoute(request: RouteRequest, signal?: AbortSignal): Promise<Route>;
}

export interface WeatherRepository {
  getForecast(request: WeatherRequest, signal?: AbortSignal): Promise<WeatherForecast | null>;
}

export interface PlacePhotoRepository {
  getPhoto(request: GetPlacePhotoRequest, signal?: AbortSignal): Promise<PlacePhoto>;
}

export interface WikimediaImageRepository {
  getImage(request: WikimediaImageRequest, signal?: AbortSignal): Promise<ResolvedImage>;
}

export interface PlaceImageRepository {
  getPlaceImage(request: PlaceImageRequest, signal?: AbortSignal): Promise<ResolvedImage>;
}

export interface DestinationCoverRepository {
  getDestinationCover(destination: string, maxWidth?: number, signal?: AbortSignal): Promise<ResolvedImage>;
}

export interface TripCoverImageRepository {
  getTripCover(request: TripCoverImageRequest, signal?: AbortSignal): Promise<ResolvedImage>;
}

export interface SavedPlacesRepository {
  listSavedPlaces(
    params?: {
      limit?: number;
      cursor?: { createdAt: string; id: string } | null;
      category?: string | null;
    },
    signal?: AbortSignal
  ): Promise<SavedPlacesPage>;

  savePlace(command: SavePlaceCommand, signal?: AbortSignal): Promise<SavedPlace>;

  unsavePlace(googlePlaceId: string, signal?: AbortSignal): Promise<boolean>;
}





export interface PlaceMetadataRepository { getMetadata(googlePlaceId: string, signal?: AbortSignal): Promise<import('./contracts').PlaceMetadata>; }
