export const weatherOwnership = 'DIRECT_CLIENT' as const;
export const openMeteoBaseUrl = 'https://api.open-meteo.com';
export const openMeteoTimeoutMilliseconds = 8_000;
export const openMeteoMaximumAttempts = 2;

export function buildOpenMeteoForecastUrl(latitude: number, longitude: number, forecastDays = 7): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    || !Number.isInteger(forecastDays) || forecastDays < 1 || forecastDays > 16) {
    throw new Error('WEATHER_INPUT_INVALID');
  }
  const query = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude), forecast_days: String(forecastDays), timezone: 'auto',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  });
  return `${openMeteoBaseUrl}/v1/forecast?${query}`;
}

export function classifyOpenMeteoFailure(status: number): 'RETRYABLE' | 'INVALID' {
  return status === 429 || status >= 500 ? 'RETRYABLE' : 'INVALID';
}
