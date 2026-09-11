/** Manual LIVE smoke: npx tsx tests/weather-scheduling.live-smoke.ts YYYY-MM-DD YYYY-MM-DD
 * Schedule/explicit sensitivity are test-only. Coordinate is from accepted real Google
 * Places evidence: p4-t001-20260909/live-smoke-provider-evidence.md, The Grand Palace.
 * No claim that the place is inherently outdoor, or that this is a persisted user plan.
 */
import { OpenMeteoWeatherRepository } from '../src/integration/remote/publicProviderRepositories';
import { evaluateWeatherScheduling } from '../src/integration/weatherScheduling';
import { applyWeatherSchedulingPolicy, type ExplicitWeatherPreference, type WeatherSchedule } from '../src/integration/weatherSchedulingPolicy';
import type { WeatherForecast } from '../src/integration/contracts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function main() {
  const [localToday, alternativeDate] = process.argv.slice(2);
  assert(localToday && alternativeDate, 'Provide explicit provider-location calendar dates');
  const coordinate = { latitude: 13.7498558, longitude: 100.4915765 };
  const schedule: WeatherSchedule = { days: [
    { dayNumber: 1, date: localToday, items: [{ id: 'live-weather-test-activity', position: 1, flexibility: 'flexible', priority: 'must_do', resolution: 'VERIFIED', ...coordinate }] },
    { dayNumber: 2, date: alternativeDate, items: [] },
  ] };
  const preferences: ExplicitWeatherPreference[] = [{ itemId: 'live-weather-test-activity', source: 'user_explicit', sensitivity: 'avoid_precipitation', allowedDayNumbers: [2] }];
  let httpAttempts = 0;
  const production = new OpenMeteoWeatherRepository(async (url, init) => {
    httpAttempts++;
    console.log(JSON.stringify({ origin: new URL(url).origin, forecastDays: new URL(url).searchParams.get('forecast_days'), timezoneRequest: new URL(url).searchParams.get('timezone'), httpAttempts }));
    return fetch(url, init);
  }, 'scheduling');
  let observed: WeatherForecast | null = null;
  const repository = { async getForecast(...args: Parameters<typeof production.getForecast>) {
    observed = await production.getForecast(...args);
    return observed;
  } };
  const result = await evaluateWeatherScheduling(schedule, preferences, { localToday }, repository);
  console.log(JSON.stringify({ coordinate, coordinateProvenance: 'accepted real Google Places result, p4-t001-20260909/live-smoke-provider-evidence.md; test-only itinerary',
    localToday, alternativeDate, normalizedForecast: observed, result, httpAttempts,
    persistenceWrites: 0, evidence: observed ? 'REAL OPEN-METEO SUCCESS' : 'BLOCKED — REAL OPEN-METEO UNAVAILABLE' }, null, 2));
  assert(observed, 'BLOCKED: real forecast unavailable; never substitute fixture weather');
  assert(httpAttempts === 1, 'Expected one HTTP attempt');
  assert(result.logicalForecastRequestCount === 1, 'Expected one logical request');
  assert(result.validation.isValid, 'T001 must pass');
  assert(['applied', 'no_change'].includes(result.status), `No usable matching scheduling facts: ${result.status}`);
  const pure = applyWeatherSchedulingPolicy(schedule, preferences, { localToday }, { coordinate, forecast: observed });
  assert(JSON.stringify(result) === JSON.stringify({ ...pure, logicalForecastRequestCount: 1 }), 'Pure policy must match');
  console.log('REAL OPEN-METEO SUCCESS — normalized facts + deterministic policy + T001 PASS; zero persistence');
}
void main().catch(() => { console.error('BLOCKED — live weather smoke did not meet success assertions'); process.exitCode = 1; });
