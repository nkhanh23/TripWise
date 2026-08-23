export const routingOwnership = 'DIRECT_CLIENT' as const;
export const osrmBaseUrl = 'https://router.project-osrm.org';
export const osrmTimeoutMilliseconds = 8_000;
export const osrmMaximumAttempts = 2;
export const osrmProfile = 'driving' as const;
export const osrmMaximumCoordinates = 25;

export type Coordinate = { latitude: number; longitude: number };

function validCoordinate(point: Coordinate): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && point.latitude >= -90 && point.latitude <= 90
    && point.longitude >= -180 && point.longitude <= 180;
}

export function buildOsrmRouteUrl(points: readonly Coordinate[], profile: string = osrmProfile): string {
  if (profile !== osrmProfile || points.length < 2 || points.length > osrmMaximumCoordinates || !points.every(validCoordinate)) {
    throw new Error('ROUTE_INPUT_INVALID');
  }
  const coordinates = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
  return `${osrmBaseUrl}/route/v1/${osrmProfile}/${coordinates}?alternatives=false&steps=false&geometries=geojson&overview=full`;
}

export function classifyOsrmFailure(status: number, providerCode?: string): 'NO_ROUTE' | 'RETRYABLE' | 'INVALID' {
  if (providerCode === 'NoRoute' || providerCode === 'NoSegment') return 'NO_ROUTE';
  if (status === 429 || status >= 500) return 'RETRYABLE';
  return 'INVALID';
}
