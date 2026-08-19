const apiVersionPath = '/api/v1';
const defaultApiBaseUrl = `http://10.0.2.2:8080${apiVersionPath}`;

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return defaultApiBaseUrl;
  }

  return trimmed.endsWith(apiVersionPath) ? trimmed : `${trimmed}${apiVersionPath}`;
}

export const apiConfig = {
  baseUrl: normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl),
  timeoutMs: 10_000,
} as const;

export { normalizeApiBaseUrl };
