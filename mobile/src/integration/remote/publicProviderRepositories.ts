import type {
  Route, RouteMatrix, RouteRequest, RouteTableRequest, WeatherForecast, WeatherRequest,
} from '../contracts';
import { IntegrationError } from '../errors';
import { mapOpenMeteoForecast, mapOsrmRoute, mapOsrmTable } from '../mappers';
import type { RouteRepository, WeatherRepository } from '../repositories';
import { executeWithReliability, publicProviderPolicy, routeMetricProviderPolicy, weatherSchedulingProviderPolicy } from '../reliability';
import {
  isRecord, parseOpenMeteoForecast, parseOsrmRoute, parseOsrmTable, validateRouteRequest, validateRouteTableRequest, validateWeatherRequest,
} from '../validation';

const osrmOrigin = 'https://router.project-osrm.org';
const openMeteoOrigin = 'https://api.open-meteo.com';

export type FetchTransport = (input: string, init?: RequestInit) => Promise<Response>;

function mapProviderStatus(status: number): IntegrationError {
  if (status === 429) return new IntegrationError('rateLimited', true);
  if (status >= 500) return new IntegrationError('providerUnavailable', true);
  return new IntegrationError('invalidResponse');
}

async function readUnknownJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    throw new IntegrationError('invalidResponse');
  }
}

export class OsrmRouteRepository implements RouteRepository {
  constructor(private readonly fetchTransport: FetchTransport = fetch) {}

  async getRoute(request: RouteRequest, signal?: AbortSignal): Promise<Route> {
    const normalized = validateRouteRequest(request);
    const coordinates = normalized.coordinates
      .map(({ latitude, longitude }) => `${longitude},${latitude}`).join(';');
    const url = `${osrmOrigin}/route/v1/driving/${coordinates}?alternatives=false&steps=false&geometries=geojson&overview=full`;

    return executeWithReliability(async (attemptSignal) => {
      const response = await this.fetchTransport(url, { method: 'GET', signal: attemptSignal });
      if (!response.ok) throw mapProviderStatus(response.status);
      const payload = await readUnknownJson(response);
      if (isRecord(payload) && payload.code === 'NoRoute') throw new IntegrationError('noRoute');
      return mapOsrmRoute(parseOsrmRoute(payload));
    }, publicProviderPolicy, signal);
  }

  async getTable(request: RouteTableRequest, signal?: AbortSignal): Promise<RouteMatrix> {
    const normalized = validateRouteTableRequest(request);
    const coordinates = normalized.coordinates
      .map((c) => String(c.longitude) + ',' + String(c.latitude)).join(';');
    const url = osrmOrigin + '/table/v1/driving/' + coordinates + '?annotations=duration,distance';

    return executeWithReliability(async (attemptSignal) => {
      const response = await this.fetchTransport(url, { method: 'GET', signal: attemptSignal });
      if (!response.ok) throw mapProviderStatus(response.status);
      const payload = await readUnknownJson(response);
      return mapOsrmTable(
        parseOsrmTable(payload, normalized.coordinates.length, { requireDistances: true }),
        normalized.coordinates,
      );
    }, routeMetricProviderPolicy, signal);
  }
}

export class OpenMeteoWeatherRepository implements WeatherRepository {
  constructor(
    private readonly fetchTransport: FetchTransport = fetch,
    private readonly usage: 'trip_detail' | 'scheduling' = 'trip_detail',
  ) {}

  async getForecast(request: WeatherRequest, signal?: AbortSignal): Promise<WeatherForecast | null> {
    const normalized = validateWeatherRequest(request);
    const query = new URLSearchParams({
      latitude: String(normalized.latitude),
      longitude: String(normalized.longitude),
      forecast_days: String(normalized.forecastDays),
      timezone: 'auto',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    });
    const url = `${openMeteoOrigin}/v1/forecast?${query.toString()}`;

    try {
      return await executeWithReliability(async (attemptSignal) => {
        const response = await this.fetchTransport(url, { method: 'GET', signal: attemptSignal });
        if (!response.ok) throw mapProviderStatus(response.status);
        return mapOpenMeteoForecast(parseOpenMeteoForecast(await readUnknownJson(response)));
      }, this.usage === 'scheduling' ? weatherSchedulingProviderPolicy : publicProviderPolicy, signal);
    } catch (error) {
      if (error instanceof IntegrationError
        && ['network', 'timeout', 'rateLimited', 'providerUnavailable'].includes(error.code)) return null;
      throw error;
    }
  }
}
