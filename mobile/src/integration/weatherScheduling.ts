import type { WeatherRepository } from './repositories';
import { IntegrationError } from './errors';
import { raceWithAbort } from './reliability';
import { OpenMeteoWeatherRepository } from './remote/publicProviderRepositories';
import {
  applyPreparedWeatherScheduling, prepareWeatherScheduling, weatherSchedulingFallback,
  type WeatherSchedulingContext, type WeatherSchedulingResult,
} from './weatherSchedulingPolicy';

export type WeatherSchedulingOptions = WeatherSchedulingContext & { signal?: AbortSignal };

/** One optional forecast request; no persistence, route calls, or raw provider JSON. */
export async function evaluateWeatherScheduling(
  input: unknown, preferences: unknown, options: WeatherSchedulingOptions,
  repository: WeatherRepository = new OpenMeteoWeatherRepository(undefined, 'scheduling'),
): Promise<WeatherSchedulingResult> {
  const prepared = prepareWeatherScheduling(input, preferences, options);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  let logicalForecastRequestCount = 0;
  const cancelled = (): WeatherSchedulingResult => {
    const baseline = 'status' in prepared ? prepared.schedule : prepared.baseline;
    return { ...weatherSchedulingFallback(baseline, prepared.validation, 'cancelled', 'aborted'), logicalForecastRequestCount };
  };
  try {
    if (controller.signal.aborted) return cancelled();
    if ('status' in prepared) return prepared;
    logicalForecastRequestCount = 1;
    const forecast = await raceWithAbort(repository.getForecast(prepared.request, controller.signal), controller.signal);
    if (controller.signal.aborted) return cancelled();
    return { ...applyPreparedWeatherScheduling(prepared, {
      coordinate: { latitude: prepared.request.latitude, longitude: prepared.request.longitude }, forecast,
    }), logicalForecastRequestCount };
  } catch (error) {
    if (controller.signal.aborted || (error instanceof IntegrationError && error.code === 'cancelled')) return cancelled();
    const baseline = 'status' in prepared ? prepared.schedule : prepared.baseline;
    return { ...weatherSchedulingFallback(baseline, prepared.validation,
      'forecast_unavailable', 'provider_failure'), logicalForecastRequestCount };
  } finally {
    options.signal?.removeEventListener('abort', cancel);
  }
}

/** Caller-scoped latest-only evaluation. Starting another run aborts the previous run.
 * Consumers must only use non-cancelled results; this object never stores/commits a plan. */
export function createWeatherSchedulingEvaluator(repository?: WeatherRepository) {
  let active: AbortController | undefined;
  return {
    async evaluate(input: unknown, preferences: unknown, options: WeatherSchedulingOptions) {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      const cancel = () => controller.abort();
      if (options.signal?.aborted) controller.abort();
      options.signal?.addEventListener('abort', cancel, { once: true });
      try {
        return await evaluateWeatherScheduling(input, preferences, { ...options, signal: controller.signal }, repository);
      } finally {
        options.signal?.removeEventListener('abort', cancel);
        if (active === controller) active = undefined;
      }
    },
    cancel() { active?.abort(); },
  };
}
