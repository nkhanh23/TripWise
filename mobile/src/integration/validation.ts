import type {
  Coordinate,
  GenerateTripRequest,
  GenerateTripSuccessEnvelope,
  GeneratedTripDay,
  GeneratedTripItem,
  GooglePlaceId,
  ItineraryDayId,
  ItineraryItemId,
  OpenMeteoTransport,
  OsrmRouteTransport,
  PersistTripCommand,
  ProfileTransport,
  ProfileStatistics,
  ResolvePlaceRequest,
  ResolvePlaceSuccessEnvelope,
  RouteRequest,
  SavedTripCursor,
  SavedTripDay,
  SavedTripDetail,
  SavedTripItem,
  SavedTripsPage,
  TripGraphPayload,
  TripId,
  UserId,
  WeatherRequest,
  GetPlacePhotoRequest,
  PlacePhoto,
  SavePlaceCommand,
  SavedPlaceId,
  SavedPlaceTransport,
  ResolvedImage,
  WikimediaImageRequest,
  ExplorePlacesRequest,
  ExplorePlacesSuccessEnvelope,
  ExploreCategory,
  WorkspaceMutationCommand,
  WorkspaceMutationResult,
  WorkspaceItemPatch,
  WorkspaceSourceLink,
} from './contracts';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{8,128}$/;
const currencyPattern = /^[A-Z]{3}$/;
const dayMilliseconds = 86_400_000;

export class ContractValidationError extends Error {
  constructor(readonly contract: string) {
    super(`Invalid ${contract} contract.`);
    this.name = 'ContractValidationError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

const exploreCategories: readonly ExploreCategory[] = [
  'all', 'attractions', 'restaurants', 'hotels', 'coffee', 'shopping',
];

export function validateExplorePlacesRequest(value: unknown): ExplorePlacesRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['center', 'radiusMeters', 'category', 'limit'])
    || !isRecord(value.center) || !hasOnlyKeys(value.center, ['latitude', 'longitude'])
    || finiteNumber(value.center.latitude, -90, 90) === null
    || finiteNumber(value.center.longitude, -180, 180) === null
    || !Number.isFinite(value.radiusMeters) || (value.radiusMeters as number) < 100
    || (value.radiusMeters as number) > 5_000
    || typeof value.category !== 'string'
    || !exploreCategories.includes(value.category as ExploreCategory)
    || (value.limit !== undefined
      && (!Number.isInteger(value.limit) || (value.limit as number) < 1 || (value.limit as number) > 12))) {
    throw new ContractValidationError('explore-places request');
  }
  return value as ExplorePlacesRequest;
}

export function parseExplorePlacesSuccess(value: unknown): ExplorePlacesSuccessEnvelope {
  if (!isRecord(value) || !hasOnlyKeys(value, ['data']) || !isRecord(value.data)
    || !hasOnlyKeys(value.data, ['places']) || !Array.isArray(value.data.places)
    || value.data.places.length > 12) {
    throw new ContractValidationError('explore-places response');
  }
  const places = value.data.places.map((place) => {
    if (!isRecord(place)
      || !hasOnlyKeys(place, ['googlePlaceId', 'name', 'latitude', 'longitude', 'category', 'categoryLabel', 'formattedAddress', 'rating', 'userRatingCount'])
      || typeof place.googlePlaceId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(place.googlePlaceId)
      || requiredString(place.name, 200) === null
      || finiteNumber(place.latitude, -90, 90) === null
      || finiteNumber(place.longitude, -180, 180) === null
      || typeof place.category !== 'string' || place.category === 'all'
      || !exploreCategories.includes(place.category as ExploreCategory)
      || requiredString(place.categoryLabel, 80) === null
      || (place.formattedAddress !== undefined && optionalString(place.formattedAddress, 500) === null)
      || (place.rating !== undefined && finiteNumber(place.rating, 0, 5) === null)
      || (place.userRatingCount !== undefined && nonNegativeInteger(place.userRatingCount) === null)) {
      throw new ContractValidationError('explore place');
    }
    return {
      googlePlaceId: asGooglePlaceId(place.googlePlaceId),
      name: (place.name as string).trim(),
      coordinate: { latitude: place.latitude as number, longitude: place.longitude as number },
      category: place.category as Exclude<ExploreCategory, 'all'>,
      categoryLabel: (place.categoryLabel as string).trim(),
      ...(place.formattedAddress === undefined ? {} : { address: (place.formattedAddress as string).trim() }),
      ...(place.rating === undefined ? {} : { rating: place.rating as number }),
      ...(place.userRatingCount === undefined ? {} : { userRatingCount: place.userRatingCount as number }),
    };
  });
  return { data: { places } };
}

function requiredString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= maximumLength ? trimmed : null;
}

function optionalString(value: unknown, maximumLength: number): string | undefined | null {
  if (value === undefined) return undefined;
  return requiredString(value, maximumLength);
}

function nullableString(value: unknown, maximumLength: number): string | null | undefined {
  if (value === undefined || value === null) return value;
  return requiredString(value, maximumLength);
}

function finiteNumber(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && timestampPattern.test(value)
    && !Number.isNaN(new Date(value).getTime());
}

export function inclusiveDurationDays(startDate: string, endDate: string): number {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw new ContractValidationError('date range');
  }
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  return Math.floor((end - start) / dayMilliseconds) + 1;
}

export function asUserId(value: unknown): UserId {
  if (!isUuid(value)) throw new ContractValidationError('user ID');
  return value as UserId;
}

export function asTripId(value: unknown): TripId {
  if (!isUuid(value)) throw new ContractValidationError('trip ID');
  return value as TripId;
}

export function asItineraryItemId(value: unknown): ItineraryItemId {
  if (!isUuid(value)) throw new ContractValidationError('itinerary item ID');
  return value as ItineraryItemId;
}

const workspaceKinds = ['place', 'custom_activity', 'restaurant', 'transport', 'accommodation', 'reservation', 'note'] as const;
const workspaceFlexibilities = ['fixed', 'flexible'] as const;
const workspacePriorities = ['must_do', 'want_to_do', 'optional'] as const;
const workspaceStatuses = ['scheduled', 'completed', 'skipped'] as const;
const sourceLinkTypes = ['google_maps', 'facebook', 'instagram', 'tiktok', 'website', 'booking', 'other'] as const;
const transportModes = ['walk', 'drive', 'transit', 'bus', 'train', 'flight', 'motorbike', 'ferry', 'other'] as const;

function nullableBoundedString(value: unknown, maximum: number): string | null | undefined {
  if (value === undefined || value === null) return value;
  return requiredString(value, maximum);
}

function validHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 2048 || /\s/.test(value)) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function validateWorkspaceItemPatch(value: unknown): WorkspaceItemPatch {
  const allowed = ['kind', 'placeName', 'placeQuery', 'flexibility', 'priority', 'startTime', 'endTime', 'note', 'contact', 'transport', 'accommodation'];
  if (!isRecord(value) || !hasOnlyKeys(value, allowed) || Object.keys(value).length === 0) throw new ContractValidationError('workspace item patch');
  if (value.kind !== undefined && (typeof value.kind !== 'string' || !workspaceKinds.includes(value.kind as typeof workspaceKinds[number]))) throw new ContractValidationError('workspace item patch');
  if (value.placeName !== undefined && requiredString(value.placeName, 160) === null) throw new ContractValidationError('workspace item patch');
  if (value.placeQuery !== undefined && nullableBoundedString(value.placeQuery, 200) === null) throw new ContractValidationError('workspace item patch');
  if (value.flexibility !== undefined && (typeof value.flexibility !== 'string' || !workspaceFlexibilities.includes(value.flexibility as typeof workspaceFlexibilities[number]))) throw new ContractValidationError('workspace item patch');
  if (value.priority !== undefined && (typeof value.priority !== 'string' || !workspacePriorities.includes(value.priority as typeof workspacePriorities[number]))) throw new ContractValidationError('workspace item patch');
  for (const key of ['startTime', 'endTime'] as const) if (value[key] !== undefined && value[key] !== null && (typeof value[key] !== 'string' || !timePattern.test(value[key]))) throw new ContractValidationError('workspace item patch');
  if (value.note !== undefined && nullableBoundedString(value.note, 500) === null) throw new ContractValidationError('workspace item patch');
  if (value.contact !== undefined) {
    if (!isRecord(value.contact)) throw new ContractValidationError('workspace contact patch');
    const contact = value.contact;
    if (!hasOnlyKeys(contact, ['name', 'phone', 'address', 'websiteUrl', 'bookingUrl', 'reservationCode'])
      || nullableBoundedString(contact.name, 120) === null || nullableBoundedString(contact.address, 500) === null
      || nullableBoundedString(contact.reservationCode, 128) === null
      || (contact.phone !== undefined && contact.phone !== null && (nullableBoundedString(contact.phone, 64) === null || typeof contact.phone !== 'string' || !/^[+0-9 ().-]+$/.test(contact.phone.trim())))
      || (contact.websiteUrl !== undefined && contact.websiteUrl !== null && !validHttpsUrl(contact.websiteUrl))
      || (contact.bookingUrl !== undefined && contact.bookingUrl !== null && !validHttpsUrl(contact.bookingUrl))) throw new ContractValidationError('workspace contact patch');
  }
  if (value.transport !== undefined) {
    if (!isRecord(value.transport)) throw new ContractValidationError('workspace transport patch');
    const transport = value.transport;
    if (!hasOnlyKeys(transport, ['mode', 'originLabel', 'destinationLabel', 'operatorName', 'departureAt', 'arrivalAt', 'plannedCostAmount', 'plannedCostCurrency'])
      || (transport.mode !== undefined && transport.mode !== null && (typeof transport.mode !== 'string' || !transportModes.includes(transport.mode as typeof transportModes[number])))
      || ['originLabel', 'destinationLabel', 'operatorName'].some((key) => nullableBoundedString(transport[key], 160) === null)
      || (transport.departureAt !== undefined && transport.departureAt !== null && !isIsoTimestamp(transport.departureAt))
      || (transport.arrivalAt !== undefined && transport.arrivalAt !== null && !isIsoTimestamp(transport.arrivalAt))
      || (transport.plannedCostAmount !== undefined && transport.plannedCostAmount !== null && finiteNumber(transport.plannedCostAmount, 0, 1_000_000_000) === null)
      || (transport.plannedCostCurrency !== undefined && transport.plannedCostCurrency !== null && (typeof transport.plannedCostCurrency !== 'string' || !currencyPattern.test(transport.plannedCostCurrency)))) throw new ContractValidationError('workspace transport patch');
  }
  if (value.accommodation !== undefined) {
    if (!isRecord(value.accommodation)) throw new ContractValidationError('workspace accommodation patch');
    const accommodation = value.accommodation;
    if (!hasOnlyKeys(accommodation, ['checkInAt', 'checkOutAt', 'nights'])
      || (accommodation.checkInAt !== undefined && accommodation.checkInAt !== null && !isIsoTimestamp(accommodation.checkInAt))
      || (accommodation.checkOutAt !== undefined && accommodation.checkOutAt !== null && !isIsoTimestamp(accommodation.checkOutAt))
      || (accommodation.nights !== undefined && accommodation.nights !== null && (!Number.isInteger(accommodation.nights) || typeof accommodation.nights !== 'number' || accommodation.nights < 0 || accommodation.nights > 365))) throw new ContractValidationError('workspace accommodation patch');
  }
  return value as WorkspaceItemPatch;
}

function validateWorkspaceLinks(value: unknown): WorkspaceSourceLink[] {
  if (!Array.isArray(value) || value.length > 12) throw new ContractValidationError('workspace source links');
  return value.map((link) => {
    if (!isRecord(link) || !hasOnlyKeys(link, ['type', 'url', 'label']) || typeof link.type !== 'string'
      || !sourceLinkTypes.includes(link.type as typeof sourceLinkTypes[number]) || !validHttpsUrl(link.url)
      || (link.label !== undefined && requiredString(link.label, 120) === null)
      || (link.type === 'other' && requiredString(link.label, 120) === null)) throw new ContractValidationError('workspace source link');
    return { type: link.type, url: (link.url as string).trim(), ...(link.label === undefined ? {} : { label: (link.label as string).trim() }) } as WorkspaceSourceLink;
  });
}

export function validateWorkspaceMutationCommand(value: unknown): WorkspaceMutationCommand {
  if (!isRecord(value) || !hasOnlyKeys(value, ['type', 'tripId', 'itemId', 'expectedRevision', 'patch', 'status', 'links'])
    || !isUuid(value.tripId) || !isUuid(value.itemId) || !Number.isInteger(value.expectedRevision) || typeof value.expectedRevision !== 'number' || value.expectedRevision < 1 || typeof value.type !== 'string') throw new ContractValidationError('workspace mutation command');
  const base = { tripId: value.tripId as TripId, itemId: value.itemId as ItineraryItemId, expectedRevision: value.expectedRevision as number };
  if (value.type === 'update_item' && value.status === undefined && value.links === undefined) return { type: 'update_item', ...base, patch: validateWorkspaceItemPatch(value.patch) };
  if (value.type === 'transition_item_status' && value.patch === undefined && value.links === undefined && typeof value.status === 'string' && workspaceStatuses.includes(value.status as typeof workspaceStatuses[number])) return { type: 'transition_item_status', ...base, status: value.status as 'scheduled' | 'completed' | 'skipped' };
  if (value.type === 'replace_source_links' && value.patch === undefined && value.status === undefined) return { type: 'replace_source_links', ...base, links: validateWorkspaceLinks(value.links) };
  throw new ContractValidationError('workspace mutation command');
}

export function parseWorkspaceMutationResult(value: unknown): WorkspaceMutationResult {
  if (!isRecord(value) || !hasOnlyKeys(value, ['revision']) || !Number.isInteger(value.revision) || typeof value.revision !== 'number' || value.revision < 1) throw new ContractValidationError('workspace mutation result');
  return { revision: value.revision as number };
}

export function asSavedPlaceId(value: unknown): SavedPlaceId {
  if (!isUuid(value)) throw new ContractValidationError('saved place ID');
  return value as SavedPlaceId;
}

export function asGooglePlaceId(value: unknown): GooglePlaceId {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(value)) {
    throw new ContractValidationError('google place ID');
  }
  return value as GooglePlaceId;
}


export function parseProfileTransport(value: unknown): ProfileTransport {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['id', 'display_name', 'avatar_url', 'home_country', 'created_at', 'updated_at'])
    || !isUuid(value.id)
    || (value.display_name !== null && typeof value.display_name !== 'string')
    || (value.avatar_url !== null && typeof value.avatar_url !== 'string')
    || (nullableString(value.display_name, 160) === null && value.display_name !== null)
    || (nullableString(value.avatar_url, 2_048) === null && value.avatar_url !== null)
    || !isIsoTimestamp(value.created_at)
    || !isIsoTimestamp(value.updated_at)) {
    throw new ContractValidationError('profile');
  }
  return value as ProfileTransport;
}

export function parseProfileStatistics(value: unknown): ProfileStatistics {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['trips_count', 'saved_places_count'])) {
    throw new ContractValidationError('profile statistics');
  }
  const tripsCount = nonNegativeInteger(value.trips_count);
  const savedPlacesCount = nonNegativeInteger(value.saved_places_count);
  if (tripsCount === null || savedPlacesCount === null) {
    throw new ContractValidationError('profile statistics');
  }
  return { tripsCount, savedPlacesCount };
}

export function validateGenerateTripRequest(value: unknown): GenerateTripRequest {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['destination', 'startDate', 'endDate', 'travelers', 'budget', 'currency', 'preferences', 'notes'])) {
    throw new ContractValidationError('generate-trip request');
  }
  const destination = requiredString(value.destination, 120);
  if (!destination || !isIsoDate(value.startDate) || !isIsoDate(value.endDate)) {
    throw new ContractValidationError('generate-trip request');
  }
  const duration = inclusiveDurationDays(value.startDate, value.endDate);
  if (duration < 1 || duration > 14) throw new ContractValidationError('generate-trip request');
  if (value.travelers !== undefined
    && (!Number.isInteger(value.travelers) || (value.travelers as number) < 1 || (value.travelers as number) > 20)) {
    throw new ContractValidationError('generate-trip request');
  }
  if (value.budget !== undefined && finiteNumber(value.budget, 0, 1_000_000_000) === null) {
    throw new ContractValidationError('generate-trip request');
  }
  if (value.currency !== undefined
    && (typeof value.currency !== 'string' || !/^[A-Za-z]{3}$/.test(value.currency))) {
    throw new ContractValidationError('generate-trip request');
  }
  if (value.preferences !== undefined
    && (!Array.isArray(value.preferences) || value.preferences.length > 10
      || value.preferences.some((item) => requiredString(item, 60) === null))) {
    throw new ContractValidationError('generate-trip request');
  }
  if (value.notes !== undefined && (typeof value.notes !== 'string' || value.notes.length > 500)) {
    throw new ContractValidationError('generate-trip request');
  }
  return {
    destination,
    startDate: value.startDate,
    endDate: value.endDate,
    ...(value.travelers === undefined ? {} : { travelers: value.travelers as number }),
    ...(value.budget === undefined ? {} : { budget: value.budget as number }),
    ...(value.currency === undefined ? {} : { currency: value.currency.toUpperCase() }),
    ...(value.preferences === undefined ? {} : {
      preferences: value.preferences.map((item) => (item as string).trim()),
    }),
    ...(value.notes === undefined ? {} : { notes: value.notes }),
  };
}

function parseGeneratedItem(value: unknown, expectedPosition: number): GeneratedTripItem {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['position', 'placeName', 'placeQuery', 'startTime', 'endTime', 'note', 'estimatedCost'])
    || value.position !== expectedPosition) {
    throw new ContractValidationError('generated itinerary item');
  }
  const placeName = requiredString(value.placeName, 160);
  const placeQuery = optionalString(value.placeQuery, 200);
  const note = optionalString(value.note, 500);
  if (!placeName || placeQuery === null || note === null) {
    throw new ContractValidationError('generated itinerary item');
  }
  if (value.startTime !== undefined && (typeof value.startTime !== 'string' || !timePattern.test(value.startTime))) {
    throw new ContractValidationError('generated itinerary item');
  }
  if (value.endTime !== undefined && (typeof value.endTime !== 'string' || !timePattern.test(value.endTime))) {
    throw new ContractValidationError('generated itinerary item');
  }
  if (typeof value.startTime === 'string' && typeof value.endTime === 'string' && value.endTime < value.startTime) {
    throw new ContractValidationError('generated itinerary item');
  }
  if (value.estimatedCost !== undefined && finiteNumber(value.estimatedCost, 0, 1_000_000_000) === null) {
    throw new ContractValidationError('generated itinerary item');
  }
  return {
    position: expectedPosition,
    placeName,
    ...(placeQuery === undefined ? {} : { placeQuery }),
    ...(value.startTime === undefined ? {} : { startTime: value.startTime }),
    ...(value.endTime === undefined ? {} : { endTime: value.endTime }),
    ...(note === undefined ? {} : { note }),
    ...(value.estimatedCost === undefined ? {} : { estimatedCost: value.estimatedCost as number }),
  };
}

function parseGeneratedDay(value: unknown, expectedDay: number, expectedDate: string): GeneratedTripDay {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['dayNumber', 'date', 'summary', 'items'])
    || value.dayNumber !== expectedDay
    || value.date !== expectedDate
    || !Array.isArray(value.items)
    || value.items.length < 1
    || value.items.length > 6) {
    throw new ContractValidationError('generated itinerary day');
  }
  const summary = optionalString(value.summary, 500);
  if (summary === null) throw new ContractValidationError('generated itinerary day');
  return {
    dayNumber: expectedDay,
    date: expectedDate,
    ...(summary === undefined ? {} : { summary }),
    items: value.items.map((item, index) => parseGeneratedItem(item, index + 1)),
  };
}

export function parseGenerateTripSuccess(value: unknown): GenerateTripSuccessEnvelope {
  if (!isRecord(value) || !hasOnlyKeys(value, ['data']) || !isRecord(value.data)) {
    throw new ContractValidationError('generate-trip response');
  }
  const trip = value.data;
  if (!hasOnlyKeys(trip, ['title', 'destination', 'startDate', 'endDate', 'summary', 'days'])) {
    throw new ContractValidationError('generate-trip response');
  }
  const title = requiredString(trip.title, 160);
  const destination = requiredString(trip.destination, 120);
  const summary = optionalString(trip.summary, 800);
  if (!title || !destination || summary === null || !isIsoDate(trip.startDate) || !isIsoDate(trip.endDate)
    || !Array.isArray(trip.days)) {
    throw new ContractValidationError('generate-trip response');
  }
  const duration = inclusiveDurationDays(trip.startDate, trip.endDate);
  if (duration < 1 || duration > 14 || trip.days.length !== duration) {
    throw new ContractValidationError('generate-trip response');
  }
  const start = Date.parse(`${trip.startDate}T00:00:00.000Z`);
  const days = trip.days.map((day, index) => parseGeneratedDay(
    day,
    index + 1,
    new Date(start + index * dayMilliseconds).toISOString().slice(0, 10),
  ));
  return {
    data: {
      title,
      destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      ...(summary === undefined ? {} : { summary }),
      days,
    },
  };
}

function validatePersistenceGraph(graph: unknown): TripGraphPayload {
  if (!isRecord(graph)
    || !hasOnlyKeys(graph, ['title', 'destination', 'startDate', 'endDate', 'estimatedBudget', 'currency', 'days'])) {
    throw new ContractValidationError('trip graph');
  }
  const title = requiredString(graph.title, 160);
  const destination = requiredString(graph.destination, 120);
  if (!title || !destination || !isIsoDate(graph.startDate) || !isIsoDate(graph.endDate)
    || !Array.isArray(graph.days)) {
    throw new ContractValidationError('trip graph');
  }
  const duration = inclusiveDurationDays(graph.startDate, graph.endDate);
  if (duration < 1 || duration > 14 || graph.days.length !== duration) {
    throw new ContractValidationError('trip graph');
  }
  if (graph.estimatedBudget !== undefined && graph.estimatedBudget !== null
    && finiteNumber(graph.estimatedBudget, 0, 1_000_000_000) === null) {
    throw new ContractValidationError('trip graph');
  }
  if (graph.currency !== undefined && graph.currency !== null
    && (typeof graph.currency !== 'string' || !currencyPattern.test(graph.currency))) {
    throw new ContractValidationError('trip graph');
  }
  let totalItems = 0;
  const start = Date.parse(`${graph.startDate}T00:00:00.000Z`);
  const days = graph.days.map((rawDay, dayIndex) => {
    if (!isRecord(rawDay)
      || !hasOnlyKeys(rawDay, ['dayNumber', 'date', 'summary', 'items'])
      || rawDay.dayNumber !== dayIndex + 1
      || rawDay.date !== new Date(start + dayIndex * dayMilliseconds).toISOString().slice(0, 10)
      || !Array.isArray(rawDay.items)
      || rawDay.items.length < 1
      || rawDay.items.length > 6) {
      throw new ContractValidationError('trip graph day');
    }
    totalItems += rawDay.items.length;
    const summary = optionalString(rawDay.summary, 500);
    if (summary === null) throw new ContractValidationError('trip graph day');
    return {
      dayNumber: dayIndex + 1,
      date: rawDay.date,
      ...(summary === undefined ? {} : { summary }),
      items: rawDay.items.map((rawItem, itemIndex) => {
        if (!isRecord(rawItem)
          || !hasOnlyKeys(rawItem, ['position', 'placeName', 'placeQuery', 'latitude', 'longitude', 'startTime', 'endTime', 'note'])
          || rawItem.position !== itemIndex + 1
          || (Object.hasOwn(rawItem, 'latitude') !== Object.hasOwn(rawItem, 'longitude'))
          || (rawItem.latitude !== undefined && rawItem.latitude !== null)
          || (rawItem.longitude !== undefined && rawItem.longitude !== null)) {
          throw new ContractValidationError('unresolved trip item');
        }
        const item = parseGeneratedItem({
          position: rawItem.position,
          placeName: rawItem.placeName,
          ...(rawItem.placeQuery === undefined ? {} : { placeQuery: rawItem.placeQuery }),
          ...(rawItem.startTime === undefined ? {} : { startTime: rawItem.startTime }),
          ...(rawItem.endTime === undefined ? {} : { endTime: rawItem.endTime }),
          ...(rawItem.note === undefined ? {} : { note: rawItem.note }),
        }, itemIndex + 1);
        return {
          position: item.position,
          placeName: item.placeName,
          ...(item.placeQuery === undefined ? {} : { placeQuery: item.placeQuery }),
          ...(rawItem.latitude === undefined ? {} : { latitude: null }),
          ...(rawItem.longitude === undefined ? {} : { longitude: null }),
          ...(item.startTime === undefined ? {} : { startTime: item.startTime }),
          ...(item.endTime === undefined ? {} : { endTime: item.endTime }),
          ...(item.note === undefined ? {} : { note: item.note }),
        };
      }),
    };
  });
  if (totalItems > 84) throw new ContractValidationError('trip graph');
  return {
    title,
    destination,
    startDate: graph.startDate,
    endDate: graph.endDate,
    ...(graph.estimatedBudget === undefined ? {} : { estimatedBudget: graph.estimatedBudget as number | null }),
    ...(graph.currency === undefined ? {} : { currency: graph.currency as string | null }),
    days,
  };
}

export function validatePersistTripCommand(value: unknown): PersistTripCommand {
  if (!isRecord(value) || !hasOnlyKeys(value, ['idempotencyKey', 'graph'])
    || typeof value.idempotencyKey !== 'string' || !idempotencyPattern.test(value.idempotencyKey)) {
    throw new ContractValidationError('persist trip command');
  }
  return { idempotencyKey: value.idempotencyKey, graph: validatePersistenceGraph(value.graph) };
}

function parseCursor(value: unknown): SavedTripCursor | null {
  if (value === null) return null;
  if (!isRecord(value) || !hasOnlyKeys(value, ['createdAt', 'id'])
    || !isIsoTimestamp(value.createdAt) || !isUuid(value.id)) {
    throw new ContractValidationError('saved trip cursor');
  }
  return { createdAt: value.createdAt, id: value.id as TripId };
}

export function validateSavedTripsPageRequest(value: unknown): { limit: number; cursor: SavedTripCursor | null } {
  if (!isRecord(value) || !hasOnlyKeys(value, ['limit', 'cursor'])) {
    throw new ContractValidationError('saved trips page request');
  }
  const limit = value.limit === undefined ? 20 : value.limit;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 50) {
    throw new ContractValidationError('saved trips page request');
  }
  return { limit: limit as number, cursor: value.cursor === undefined ? null : parseCursor(value.cursor) };
}

export function parseSavedTripsPage(value: unknown): SavedTripsPage {
  if (!isRecord(value) || !hasOnlyKeys(value, ['items', 'nextCursor']) || !Array.isArray(value.items)) {
    throw new ContractValidationError('saved trips page');
  }
  const items = value.items.map((item) => {
    if (!isRecord(item)
      || !hasOnlyKeys(item, ['id', 'title', 'destination', 'startDate', 'endDate', 'estimatedBudget', 'currency', 'createdAt', 'dayCount', 'itemCount', 'coverGooglePlaceIds'])
      || !isUuid(item.id) || !isIsoDate(item.startDate) || !isIsoDate(item.endDate)
      || !isIsoTimestamp(item.createdAt)) {
      throw new ContractValidationError('saved trip summary');
    }
    const title = requiredString(item.title, 160);
    const destination = requiredString(item.destination, 120);
    const estimatedBudget = item.estimatedBudget === null ? null : finiteNumber(item.estimatedBudget, 0, 1_000_000_000);
    const currency = nullableString(item.currency, 3);
    const dayCount = nonNegativeInteger(item.dayCount);
    const itemCount = nonNegativeInteger(item.itemCount);
    const coverGooglePlaceIds = item.coverGooglePlaceIds === undefined ? [] : item.coverGooglePlaceIds;
    const validCoverGooglePlaceIds = Array.isArray(coverGooglePlaceIds)
      && coverGooglePlaceIds.length <= 2
      && coverGooglePlaceIds.every((placeId) =>
        typeof placeId === 'string' && /^[A-Za-z0-9_-]{10,200}$/.test(placeId));
    if (!title || !destination
      || (estimatedBudget === null && item.estimatedBudget !== null)
      || currency === undefined
      || (currency === null && item.currency !== null)
      || (currency !== null && !currencyPattern.test(currency)) || dayCount === null || itemCount === null
      || !validCoverGooglePlaceIds) {
      throw new ContractValidationError('saved trip summary');
    }
    return {
      id: item.id as TripId,
      title,
      destination,
      startDate: item.startDate,
      endDate: item.endDate,
      estimatedBudget,
      currency,
      createdAt: item.createdAt,
      dayCount,
      itemCount,
      coverGooglePlaceIds: (coverGooglePlaceIds as string[]).map((placeId) => placeId as GooglePlaceId),
    };
  });
  return { items, nextCursor: parseCursor(value.nextCursor) };
}

function parseSavedTripItem(value: unknown, expectedPosition: number): SavedTripItem {
  if (!isRecord(value)
    || !isUuid(value.id)
    || value.position !== expectedPosition
    || (value.resolution !== 'UNRESOLVED' && value.resolution !== 'VERIFIED')) {
    throw new ContractValidationError('saved trip item');
  }
  const allowed = [
    'id', 'position', 'placeName', 'placeQuery', 'resolution', 'googlePlaceId', 'latitude', 'longitude',
    'placeAddress', 'placeCategory', 'placeResolvedAt', 'startTime', 'endTime', 'note',
  ];
  if (!hasOnlyKeys(value, allowed)) throw new ContractValidationError('saved trip item');
  const placeName = requiredString(value.placeName, 160);
  const placeQuery = optionalString(value.placeQuery, 200);
  const note = optionalString(value.note, 500);
  if (!placeName || placeQuery === null || note === null
    || (value.startTime !== undefined && (typeof value.startTime !== 'string' || !timePattern.test(value.startTime)))
    || (value.endTime !== undefined && (typeof value.endTime !== 'string' || !timePattern.test(value.endTime)))) {
    throw new ContractValidationError('saved trip item');
  }
  const base = {
    id: value.id as ItineraryItemId,
    position: expectedPosition,
    placeName,
    ...(placeQuery === undefined ? {} : { placeQuery }),
    ...(value.startTime === undefined ? {} : { startTime: value.startTime }),
    ...(value.endTime === undefined ? {} : { endTime: value.endTime }),
    ...(note === undefined ? {} : { note }),
  };
  if (value.resolution === 'UNRESOLVED') {
    if (value.googlePlaceId !== undefined || value.latitude !== undefined || value.longitude !== undefined
      || value.placeAddress !== undefined || value.placeCategory !== undefined || value.placeResolvedAt !== undefined) {
      throw new ContractValidationError('unresolved saved trip item');
    }
    return { ...base, resolution: 'UNRESOLVED', latitude: null, longitude: null };
  }
  const latitude = finiteNumber(value.latitude, -90, 90);
  const longitude = finiteNumber(value.longitude, -180, 180);
  const googlePlaceId = requiredString(value.googlePlaceId, 255);
  const placeAddress = optionalString(value.placeAddress, 500);
  const placeCategory = optionalString(value.placeCategory, 100);
  if (latitude === null || longitude === null || !googlePlaceId || !isIsoTimestamp(value.placeResolvedAt)
    || placeAddress === null || placeCategory === null) {
    throw new ContractValidationError('verified saved trip item');
  }
  return {
    ...base,
    resolution: 'VERIFIED',
    googlePlaceId: googlePlaceId as GooglePlaceId,
    latitude,
    longitude,
    ...(placeAddress === undefined ? {} : { placeAddress }),
    ...(placeCategory === undefined ? {} : { placeCategory }),
    placeResolvedAt: value.placeResolvedAt,
  };
}

function parseSavedTripDay(value: unknown, expectedDay: number, startDate: string): SavedTripDay {
  if (!isRecord(value) || !hasOnlyKeys(value, ['id', 'dayNumber', 'date', 'summary', 'items'])
    || !isUuid(value.id) || value.dayNumber !== expectedDay || !Array.isArray(value.items)) {
    throw new ContractValidationError('saved trip day');
  }
  const date = optionalString(value.date, 10);
  const summary = optionalString(value.summary, 500);
  if (date === null || summary === null || (date !== undefined && !isIsoDate(date))) {
    throw new ContractValidationError('saved trip day');
  }
  if (date !== undefined) {
    const expectedDate = new Date(Date.parse(`${startDate}T00:00:00.000Z`) + (expectedDay - 1) * dayMilliseconds)
      .toISOString().slice(0, 10);
    if (date !== expectedDate) throw new ContractValidationError('saved trip day');
  }
  return {
    id: value.id as ItineraryDayId,
    dayNumber: expectedDay,
    ...(date === undefined ? {} : { date }),
    ...(summary === undefined ? {} : { summary }),
    items: value.items.map((item, index) => parseSavedTripItem(item, index + 1)),
  };
}

export function parseSavedTripDetail(value: unknown): SavedTripDetail | null {
  if (value === null) return null;
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['id', 'title', 'destination', 'startDate', 'endDate', 'estimatedBudget', 'currency', 'createdAt', 'updatedAt', 'days'])
    || !isUuid(value.id) || !isIsoDate(value.startDate) || !isIsoDate(value.endDate)
    || !isIsoTimestamp(value.createdAt) || !isIsoTimestamp(value.updatedAt) || !Array.isArray(value.days)) {
    throw new ContractValidationError('saved trip detail');
  }
  const title = requiredString(value.title, 160);
  const destination = requiredString(value.destination, 120);
  const estimatedBudget = value.estimatedBudget === undefined || value.estimatedBudget === null
    ? null
    : finiteNumber(value.estimatedBudget, 0, 1_000_000_000);
  const currency = value.currency === undefined || value.currency === null
    ? null
    : requiredString(value.currency, 3);
  const duration = inclusiveDurationDays(value.startDate, value.endDate);
  if (!title || !destination
    || (estimatedBudget === null && value.estimatedBudget !== undefined && value.estimatedBudget !== null)
    || (currency !== null && !currencyPattern.test(currency))
    || value.days.length !== duration) {
    throw new ContractValidationError('saved trip detail');
  }
  return {
    id: value.id as TripId,
    title,
    destination,
    startDate: value.startDate,
    endDate: value.endDate,
    estimatedBudget,
    currency,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    days: value.days.map((day, index) => parseSavedTripDay(day, index + 1, value.startDate as string)),
  };
}

export function validateResolvePlaceRequest(value: unknown): ResolvePlaceRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['itineraryItemId']) || !isUuid(value.itineraryItemId)) {
    throw new ContractValidationError('resolve-place request');
  }
  return { itineraryItemId: value.itineraryItemId as ItineraryItemId };
}

export function parseResolvePlaceSuccess(value: unknown): ResolvePlaceSuccessEnvelope {
  if (!isRecord(value) || !hasOnlyKeys(value, ['data']) || !isRecord(value.data)
    || !hasOnlyKeys(value.data, ['itineraryItemId', 'resolution', 'resolvedAt'])
    || !isUuid(value.data.itineraryItemId)
    || (value.data.resolution !== 'VERIFIED' && value.data.resolution !== 'VERIFIED_REFRESHED')
    || !isIsoTimestamp(value.data.resolvedAt)) {
    throw new ContractValidationError('resolve-place response');
  }
  return {
    data: {
      itineraryItemId: value.data.itineraryItemId as ItineraryItemId,
      resolution: value.data.resolution,
      resolvedAt: value.data.resolvedAt,
    },
  };
}

export function isValidCoordinate(value: unknown): value is Coordinate {
  return isRecord(value)
    && hasOnlyKeys(value, ['latitude', 'longitude'])
    && finiteNumber(value.latitude, -90, 90) !== null
    && finiteNumber(value.longitude, -180, 180) !== null;
}

export function validateRouteRequest(value: unknown): RouteRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['profile', 'coordinates']) || value.profile !== 'driving'
    || !Array.isArray(value.coordinates) || value.coordinates.length < 2 || value.coordinates.length > 25
    || !value.coordinates.every(isValidCoordinate)) {
    throw new ContractValidationError('route request');
  }
  return { profile: 'driving', coordinates: value.coordinates };
}

export function parseOsrmRoute(value: unknown): OsrmRouteTransport {
  if (!isRecord(value) || value.code !== 'Ok' || !Array.isArray(value.routes) || value.routes.length < 1) {
    throw new ContractValidationError('OSRM response');
  }
  const route = value.routes[0];
  if (!isRecord(route) || finiteNumber(route.distance, 0, Number.MAX_SAFE_INTEGER) === null
    || finiteNumber(route.duration, 0, Number.MAX_SAFE_INTEGER) === null || !isRecord(route.geometry)
    || route.geometry.type !== 'LineString' || !Array.isArray(route.geometry.coordinates)
    || route.geometry.coordinates.length < 2
    || route.geometry.coordinates.some((point) => !Array.isArray(point) || point.length !== 2
      || finiteNumber(point[0], -180, 180) === null || finiteNumber(point[1], -90, 90) === null)) {
    throw new ContractValidationError('OSRM response');
  }
  const distance = finiteNumber(route.distance, 0, Number.MAX_SAFE_INTEGER);
  const duration = finiteNumber(route.duration, 0, Number.MAX_SAFE_INTEGER);
  if (distance === null || duration === null) throw new ContractValidationError('OSRM response');
  return {
    code: 'Ok',
    routes: [{
      distance,
      duration,
      geometry: {
        type: 'LineString',
        coordinates: route.geometry.coordinates.map((point) => [point[0], point[1]] as [number, number]),
      },
    }],
  };
}

export function validateWeatherRequest(value: unknown): WeatherRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['latitude', 'longitude', 'forecastDays'])
    || !isValidCoordinate({ latitude: value.latitude, longitude: value.longitude })
    || !Number.isInteger(value.forecastDays) || (value.forecastDays as number) < 1 || (value.forecastDays as number) > 16) {
    throw new ContractValidationError('weather request');
  }
  return {
    latitude: value.latitude as number,
    longitude: value.longitude as number,
    forecastDays: value.forecastDays as number,
  };
}

function parseNullableNumberArray(value: unknown, length: number, minimum: number, maximum: number): (number | null)[] {
  if (!Array.isArray(value) || value.length !== length
    || value.some((item) => item !== null && finiteNumber(item, minimum, maximum) === null)) {
    throw new ContractValidationError('Open-Meteo response');
  }
  return value as (number | null)[];
}

export function parseOpenMeteoForecast(value: unknown): OpenMeteoTransport {
  if (!isRecord(value) || !isRecord(value.daily) || !Array.isArray(value.daily.time)
    || value.daily.time.length < 1 || value.daily.time.length > 16
    || value.daily.time.some((date) => !isIsoDate(date))) {
    throw new ContractValidationError('Open-Meteo response');
  }
  const length = value.daily.time.length;
  return {
    daily: {
      time: [...value.daily.time] as string[],
      weather_code: parseNullableNumberArray(value.daily.weather_code, length, 0, 99),
      temperature_2m_max: parseNullableNumberArray(value.daily.temperature_2m_max, length, -100, 100),
      temperature_2m_min: parseNullableNumberArray(value.daily.temperature_2m_min, length, -100, 100),
      precipitation_probability_max: parseNullableNumberArray(value.daily.precipitation_probability_max, length, 0, 100),
    },
  };
}

export function validateGetPlacePhotoRequest(value: unknown): GetPlacePhotoRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['googlePlaceId', 'maxWidth']) || typeof value.googlePlaceId !== 'string'
    || !/^[A-Za-z0-9_-]{10,200}$/.test(value.googlePlaceId)) {
    throw new ContractValidationError('get-place-photo request');
  }
  let maxWidth: number | undefined = undefined;
  if (value.maxWidth !== undefined && value.maxWidth !== null) {
    if (typeof value.maxWidth !== 'number' || !Number.isFinite(value.maxWidth) || value.maxWidth < 100 || value.maxWidth > 4800) {
      throw new ContractValidationError('get-place-photo request');
    }
    maxWidth = Math.floor(value.maxWidth);
  }
  return { googlePlaceId: value.googlePlaceId, ...(maxWidth !== undefined ? { maxWidth } : {}) };
}

export function parseGetPlacePhotoSuccess(value: unknown): { data: PlacePhoto } {
  if (!isRecord(value) || !hasOnlyKeys(value, ['data']) || !isRecord(value.data)
    || typeof value.data.googlePlaceId !== 'string'
    || (value.data.photoUri !== null && typeof value.data.photoUri !== 'string')) {
    throw new ContractValidationError('get-place-photo response');
  }
  let authorAttribution: PlacePhoto['authorAttribution'] = undefined;
  let diagnostic: PlacePhoto['diagnostic'] = undefined;
  if (value.data.diagnostic !== undefined && value.data.diagnostic !== null) {
    if (!isRecord(value.data.diagnostic)
      || typeof value.data.diagnostic.providerStatus !== 'number'
      || !Number.isInteger(value.data.diagnostic.providerStatus)
      || typeof value.data.diagnostic.hasPhotosProperty !== 'boolean'
      || typeof value.data.diagnostic.photosIsArray !== 'boolean'
      || typeof value.data.diagnostic.photosCount !== 'number'
      || !Number.isInteger(value.data.diagnostic.photosCount)
      || value.data.diagnostic.photosCount < 0
      || typeof value.data.diagnostic.firstPhotoHasName !== 'boolean') {
      throw new ContractValidationError('get-place-photo response');
    }
    diagnostic = {
      providerStatus: value.data.diagnostic.providerStatus,
      hasPhotosProperty: value.data.diagnostic.hasPhotosProperty,
      photosIsArray: value.data.diagnostic.photosIsArray,
      photosCount: value.data.diagnostic.photosCount,
      firstPhotoHasName: value.data.diagnostic.firstPhotoHasName,
    };
  }
  if (value.data.authorAttribution !== undefined && value.data.authorAttribution !== null) {
    if (!isRecord(value.data.authorAttribution)) {
      throw new ContractValidationError('get-place-photo response');
    }
    authorAttribution = {
      displayName: typeof value.data.authorAttribution.displayName === 'string' ? value.data.authorAttribution.displayName : undefined,
      uri: typeof value.data.authorAttribution.uri === 'string' ? value.data.authorAttribution.uri : undefined,
      photoUri: typeof value.data.authorAttribution.photoUri === 'string' ? value.data.authorAttribution.photoUri : undefined,
    };
  }
  return {
    data: {
      googlePlaceId: value.data.googlePlaceId,
      photoUri: value.data.photoUri,
      ...(diagnostic ? { diagnostic } : {}),
      ...(authorAttribution ? { authorAttribution } : {}),
    },
  };
}

export function validateWikimediaImageRequest(value: unknown): WikimediaImageRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['kind', 'googlePlaceId', 'destination', 'maxWidth'])) {
    throw new ContractValidationError('get-wikimedia-image request');
  }
  const maxWidth = value.maxWidth === undefined ? undefined : finiteNumber(value.maxWidth, 100, 1600);
  if (value.maxWidth !== undefined && maxWidth === null) {
    throw new ContractValidationError('get-wikimedia-image request');
  }
  if (value.kind === 'PLACE' && typeof value.googlePlaceId === 'string'
    && /^[A-Za-z0-9_-]{10,200}$/.test(value.googlePlaceId)
    && value.destination === undefined) {
    return { kind: 'PLACE', googlePlaceId: value.googlePlaceId, ...(maxWidth ? { maxWidth } : {}) };
  }
  const destination = requiredString(value.destination, 120);
  if (value.kind === 'DESTINATION' && destination && value.googlePlaceId === undefined) {
    return { kind: 'DESTINATION', destination, ...(maxWidth ? { maxWidth } : {}) };
  }
  throw new ContractValidationError('get-wikimedia-image request');
}

export function parseWikimediaImageSuccess(value: unknown): { data: ResolvedImage } {
  if (!isRecord(value) || !hasOnlyKeys(value, ['data']) || !isRecord(value.data)
    || !hasOnlyKeys(value.data, ['uri', 'source', 'attribution', 'matchedEntity', 'confidence'])
    || (value.data.uri !== null && typeof value.data.uri !== 'string')
    || (value.data.source !== 'WIKIMEDIA_PLACE' && value.data.source !== 'DESTINATION_COVER')) {
    throw new ContractValidationError('get-wikimedia-image response');
  }
  let attribution: ResolvedImage['attribution'];
  if (value.data.attribution !== undefined) {
    if (!isRecord(value.data.attribution)
      || !hasOnlyKeys(value.data.attribution, ['displayName', 'sourceUrl', 'license', 'licenseUrl'])
      || !requiredString(value.data.attribution.displayName, 500)
      || !requiredString(value.data.attribution.sourceUrl, 2_048)
      || (value.data.attribution.license !== undefined && !requiredString(value.data.attribution.license, 160))
      || (value.data.attribution.licenseUrl !== undefined && !requiredString(value.data.attribution.licenseUrl, 2_048))) {
      throw new ContractValidationError('get-wikimedia-image response');
    }
    attribution = {
      displayName: value.data.attribution.displayName as string,
      sourceUrl: value.data.attribution.sourceUrl as string,
      ...(value.data.attribution.license === undefined ? {} : { license: value.data.attribution.license as string }),
      ...(value.data.attribution.licenseUrl === undefined ? {} : { licenseUrl: value.data.attribution.licenseUrl as string }),
    };
  }
  if (value.data.matchedEntity !== undefined && !requiredString(value.data.matchedEntity, 500)) {
    throw new ContractValidationError('get-wikimedia-image response');
  }
  const confidence = value.data.confidence === undefined ? undefined : finiteNumber(value.data.confidence, 0, 1);
  if (value.data.confidence !== undefined && confidence === null) {
    throw new ContractValidationError('get-wikimedia-image response');
  }
  return {
    data: {
      uri: value.data.uri,
      source: value.data.source,
      ...(attribution ? { attribution } : {}),
      ...(value.data.matchedEntity === undefined ? {} : { matchedEntity: value.data.matchedEntity as string }),
      ...(typeof confidence === 'number' ? { confidence } : {}),
    },
  };
}

export function validateSavePlaceCommand(value: unknown): SavePlaceCommand {
  if (!isRecord(value) || !hasOnlyKeys(value, ['googlePlaceId', 'name', 'latitude', 'longitude', 'address', 'category'])) {
    throw new ContractValidationError('save_place command');
  }
  const googlePlaceId = requiredString(value.googlePlaceId, 200);
  const name = requiredString(value.name, 250);
  const latitude = finiteNumber(value.latitude, -90, 90);
  const longitude = finiteNumber(value.longitude, -180, 180);
  const address = optionalString(value.address, 500);
  const category = optionalString(value.category, 100);

  if (!googlePlaceId || !/^[A-Za-z0-9_-]{10,200}$/.test(googlePlaceId) || !name || latitude === null || longitude === null) {
    throw new ContractValidationError('save_place command');
  }

  return {
    googlePlaceId,
    name,
    latitude,
    longitude,
    ...(address !== undefined && address !== null ? { address } : {}),
    ...(category !== undefined && category !== null ? { category } : {}),
  };
}

export function parseSavedPlaceTransport(value: unknown): SavedPlaceTransport {
  if (!isRecord(value) || !hasOnlyKeys(value, ['id', 'googlePlaceId', 'placeName', 'latitude', 'longitude', 'placeAddress', 'placeCategory', 'createdAt'])) {
    throw new ContractValidationError('saved_place row');
  }
  const id = requiredString(value.id, 64);
  const googlePlaceId = requiredString(value.googlePlaceId, 200);
  const placeName = requiredString(value.placeName, 250);
  const latitude = finiteNumber(value.latitude, -90, 90);
  const longitude = finiteNumber(value.longitude, -180, 180);
  const placeAddress = optionalString(value.placeAddress, 500);
  const placeCategory = optionalString(value.placeCategory, 100);
  const createdAt = requiredString(value.createdAt, 64);

  if (!id || !isUuid(id) || !googlePlaceId || !placeName || latitude === null || longitude === null || !createdAt || !isIsoTimestamp(createdAt)) {
    throw new ContractValidationError('saved_place row');
  }

  return {
    id,
    googlePlaceId,
    placeName,
    latitude,
    longitude,
    placeAddress: placeAddress ?? null,
    placeCategory: placeCategory ?? null,
    createdAt,
  };
}

export function parseSavedPlacesPage(value: unknown): {
  items: SavedPlaceTransport[];
  nextCursor: { createdAt: string; id: string } | null;
} {
  if (!isRecord(value) || !hasOnlyKeys(value, ['items', 'nextCursor']) || !Array.isArray(value.items)) {
    throw new ContractValidationError('list_saved_places response');
  }

  const items = value.items.map((item) => parseSavedPlaceTransport(item));

  let nextCursor: { createdAt: string; id: string } | null = null;
  if (value.nextCursor !== null && value.nextCursor !== undefined) {
    if (!isRecord(value.nextCursor) || !hasOnlyKeys(value.nextCursor, ['createdAt', 'id'])) {
      throw new ContractValidationError('list_saved_places response');
    }
    const createdAt = requiredString(value.nextCursor.createdAt, 64);
    const id = requiredString(value.nextCursor.id, 64);
    if (!createdAt || !isIsoTimestamp(createdAt) || !id || !isUuid(id)) {
      throw new ContractValidationError('list_saved_places response');
    }
    nextCursor = { createdAt, id };
  }

  return {
    items,
    nextCursor,
  };
}
