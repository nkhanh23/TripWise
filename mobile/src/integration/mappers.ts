import type { Session, User } from '@supabase/supabase-js';

import type {
  AuthenticatedSession,
  AuthenticatedUser,
  DailyWeather,
  FixtureId,
  GeneratedTrip,
  OpenMeteoTransport,
  OsrmRouteTransport,
  Profile,
  ProfileTransport,
  Route,
  SavedPlace,
  SavedPlaceTransport,
  SavedTripDetail,
  TripGraphPayload,
  WeatherForecast,
} from './contracts';
import { asGooglePlaceId, asSavedPlaceId, asUserId, ContractValidationError, inclusiveDurationDays } from './validation';

export function mapAuthenticatedUser(user: User): AuthenticatedUser {
  const metadataName = user.user_metadata.display_name;
  return {
    id: asUserId(user.id),
    email: user.email ?? null,
    displayName: typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null,
  };
}

export function mapAuthenticatedSession(session: Session): AuthenticatedSession {
  return {
    user: mapAuthenticatedUser(session.user),
    expiresAt: session.expires_at ?? null,
  };
}

export function mapProfile(profile: ProfileTransport): Profile {
  return {
    id: asUserId(profile.id),
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    homeCountry: profile.home_country ?? '',
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export function asFixtureId(value: string): FixtureId {
  const trimmed = value.trim();
  if (!trimmed) throw new ContractValidationError('fixture ID');
  return trimmed as FixtureId;
}

export function resolveTripTitle(userEnteredTitle: string | null | undefined, generatedTitle: string): string {
  const preferred = userEnteredTitle?.trim();
  const fallback = generatedTitle.trim();
  if (preferred) return preferred;
  if (fallback) return fallback;
  throw new ContractValidationError('trip title');
}

export function assertInclusiveDuration(startDate: string, endDate: string, durationDays: number): void {
  if (!Number.isInteger(durationDays) || inclusiveDurationDays(startDate, endDate) !== durationDays) {
    throw new ContractValidationError('inclusive trip duration');
  }
}

export type GeneratedTripPersistenceOptions = {
  userEnteredTitle?: string | null;
  estimatedBudget?: number | null;
  currency?: string | null;
};

export function mapGeneratedTripToGraph(
  generated: GeneratedTrip,
  options: GeneratedTripPersistenceOptions = {},
): TripGraphPayload {
  const estimatedBudget = options.estimatedBudget;
  if (estimatedBudget !== undefined && estimatedBudget !== null
    && (!Number.isFinite(estimatedBudget) || estimatedBudget < 0 || estimatedBudget > 1_000_000_000)) {
    throw new ContractValidationError('estimated budget');
  }
  const currency = options.currency?.trim().toUpperCase() ?? null;
  if (estimatedBudget != null && (currency === null || !/^[A-Z]{3}$/.test(currency))) {
    throw new ContractValidationError('currency');
  }
  return {
    title: resolveTripTitle(options.userEnteredTitle, generated.title),
    destination: generated.destination,
    startDate: generated.startDate,
    endDate: generated.endDate,
    ...(estimatedBudget === undefined ? {} : { estimatedBudget }),
    ...(estimatedBudget == null ? {} : { currency }),
    days: generated.days.map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
      ...(day.summary === undefined ? {} : { summary: day.summary }),
      items: day.items.map((item) => ({
        position: item.position,
        placeName: item.placeName,
        ...(item.placeQuery === undefined ? {} : { placeQuery: item.placeQuery }),
        ...(item.startTime === undefined ? {} : { startTime: item.startTime }),
        ...(item.endTime === undefined ? {} : { endTime: item.endTime }),
        ...(item.note === undefined ? {} : { note: item.note }),
      })),
    })),
  };
}

export function mapSavedTripDetail(detail: SavedTripDetail): SavedTripDetail {
  return {
    ...detail,
    days: detail.days.map((day) => ({
      ...day,
      items: day.items.map((item) => ({ ...item })),
    })),
  };
}

export function mapOsrmRoute(transport: OsrmRouteTransport): Route {
  const route = transport.routes[0];
  return {
    profile: 'driving',
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
  };
}

export function mapOpenMeteoForecast(transport: OpenMeteoTransport): WeatherForecast {
  const days: DailyWeather[] = transport.daily.time.map((date, index) => ({
    date,
    weatherCode: transport.daily.weather_code[index],
    maximumTemperatureCelsius: transport.daily.temperature_2m_max[index],
    minimumTemperatureCelsius: transport.daily.temperature_2m_min[index],
    maximumPrecipitationProbability: transport.daily.precipitation_probability_max[index],
  }));
  return { days };
}

export function mapSavedPlace(transport: SavedPlaceTransport): SavedPlace {
  return {
    id: asSavedPlaceId(transport.id),
    googlePlaceId: asGooglePlaceId(transport.googlePlaceId),
    name: transport.placeName,
    latitude: transport.latitude,
    longitude: transport.longitude,
    address: transport.placeAddress ?? null,
    category: transport.placeCategory ?? null,
    createdAt: transport.createdAt,
  };
}

