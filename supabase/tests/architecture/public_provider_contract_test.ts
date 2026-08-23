import { assertEquals, assertThrows } from 'jsr:@std/assert@1.0.15';
import {
  buildOsrmRouteUrl, classifyOsrmFailure, osrmBaseUrl, osrmMaximumAttempts, osrmTimeoutMilliseconds, routingOwnership,
} from '../../contracts/public-providers/routing.ts';
import {
  buildOpenMeteoForecastUrl, classifyOpenMeteoFailure, openMeteoBaseUrl, openMeteoMaximumAttempts,
  openMeteoTimeoutMilliseconds, weatherOwnership,
} from '../../contracts/public-providers/weather.ts';

Deno.test('OSRM remains fixed direct-client route ownership with bounded reliability', () => {
  assertEquals(routingOwnership, 'DIRECT_CLIENT');
  assertEquals(osrmTimeoutMilliseconds, 8_000);
  assertEquals(osrmMaximumAttempts, 2);
  const url = buildOsrmRouteUrl([{ latitude: 13.75, longitude: 100.49 }, { latitude: 13.76, longitude: 100.50 }]);
  assertEquals(new URL(url).origin, osrmBaseUrl);
  assertEquals(new URL(url).pathname.startsWith('/route/v1/driving/'), true);
});

Deno.test('OSRM contract rejects malformed coordinates, arbitrary profile and oversized route', () => {
  assertThrows(() => buildOsrmRouteUrl([{ latitude: 91, longitude: 0 }, { latitude: 0, longitude: 0 }]));
  assertThrows(() => buildOsrmRouteUrl([{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }], 'arbitrary'));
  assertThrows(() => buildOsrmRouteUrl(Array.from({ length: 26 }, () => ({ latitude: 0, longitude: 0 }))));
  assertEquals(classifyOsrmFailure(200, 'NoRoute'), 'NO_ROUTE');
  assertEquals(classifyOsrmFailure(429), 'RETRYABLE');
  assertEquals(classifyOsrmFailure(400, 'InvalidQuery'), 'INVALID');
});

Deno.test('Open-Meteo remains fixed direct-client ownership with bounded forecast contract', () => {
  assertEquals(weatherOwnership, 'DIRECT_CLIENT');
  assertEquals(openMeteoTimeoutMilliseconds, 8_000);
  assertEquals(openMeteoMaximumAttempts, 2);
  const url = new URL(buildOpenMeteoForecastUrl(13.75, 100.49, 7));
  assertEquals(url.origin, openMeteoBaseUrl);
  assertEquals(url.pathname, '/v1/forecast');
  assertEquals(url.searchParams.get('forecast_days'), '7');
  assertEquals(url.searchParams.get('timezone'), 'auto');
});

Deno.test('Open-Meteo contract rejects invalid inputs and classifies only transient retry', () => {
  assertThrows(() => buildOpenMeteoForecastUrl(-91, 0));
  assertThrows(() => buildOpenMeteoForecastUrl(0, 181));
  assertThrows(() => buildOpenMeteoForecastUrl(0, 0, 17));
  assertEquals(classifyOpenMeteoFailure(503), 'RETRYABLE');
  assertEquals(classifyOpenMeteoFailure(400), 'INVALID');
});
