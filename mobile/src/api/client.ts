import { apiConfig } from './config';
import type { BackendErrorResponse } from './contracts';
import { ApiException, ApiTimeoutException } from './errors';

export type ApiClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  getAccessToken?: () => string | undefined;
};

export type RequestOptions = Omit<RequestInit, 'body' | 'headers' | 'signal'> & {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  requiresAuth?: boolean;
};

function isBackendErrorResponse(value: unknown): value is BackendErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.status === 'number' && typeof candidate.error === 'string' && typeof candidate.message === 'string';
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : undefined;
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly getAccessToken?: () => string | undefined;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? apiConfig.baseUrl;
    this.timeoutMs = options.timeoutMs ?? apiConfig.timeoutMs;
    this.getAccessToken = options.getAccessToken;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const externalAbort = () => controller.abort();
    options.signal?.addEventListener('abort', externalAbort, { once: true });

    try {
      const headers = new Headers({ Accept: 'application/json', ...options.headers });
      const token = options.requiresAuth ? this.getAccessToken?.() : undefined;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const hasBody = options.body !== undefined;
      if (hasBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(buildUrl(this.baseUrl, path), {
        ...options,
        headers,
        signal: controller.signal,
        body: hasBody ? JSON.stringify(options.body) : undefined,
      });
      const payload = await parseJson(response);

      if (!response.ok) {
        if (isBackendErrorResponse(payload)) {
          throw new ApiException(payload);
        }
        throw new ApiException({ status: response.status, error: response.statusText, message: response.statusText || 'Request failed' });
      }

      return payload as T;
    } catch (error) {
      if (controller.signal.aborted && !options.signal?.aborted) {
        throw new ApiTimeoutException();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', externalAbort);
    }
  }
}

export const apiClient = new ApiClient();
