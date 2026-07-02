import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  hasRefreshToken,
  setAuthSession
} from "./auth-session";
import type { ApiResponse, AuthTokens, ErrorResponse } from "./contracts";
import { ApiError, AuthSessionExpiredError } from "./errors";

export interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: BodyInit | object | null;
  headers?: HeadersInit;
  requiresAuth?: boolean;
  retryOnUnauthorized?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

let refreshPromise: Promise<AuthTokens> | null = null;

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return API_BASE_URL;
}

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function createHeaders(headers?: HeadersInit) {
  return new Headers(headers);
}

function serializeBody(body: RequestOptions["body"], headers: Headers) {
  if (body === undefined) {
    return undefined;
  }

  if (
    body === null ||
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const rawText = await response.text();
  if (!rawText) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return rawText as T;
  }

  return JSON.parse(rawText) as T;
}

async function parseError(response: Response) {
  const parsed = await parseResponse<ErrorResponse | undefined>(response);

  if (parsed && typeof parsed.status === "number" && typeof parsed.message === "string") {
    return new ApiError(parsed);
  }

  return new ApiError({
    status: response.status,
    error: response.statusText || "Request failed",
    message: response.statusText || "Request failed"
  });
}

async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthSession();
    throw new AuthSessionExpiredError();
  }

  const response = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    clearAuthSession();
    throw new AuthSessionExpiredError();
  }

  const payload = await parseResponse<ApiResponse<AuthTokens>>(response);
  if (!payload?.data?.accessToken || !payload.data.refreshToken) {
    clearAuthSession();
    throw new AuthSessionExpiredError();
  }

  setAuthSession(payload.data);
  return payload.data;
}

async function getRefreshedTokens() {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function send<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = createHeaders(options.headers);
  const shouldRetry = options.retryOnUnauthorized ?? options.requiresAuth ?? false;

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const accessToken = getAccessToken();
  if (options.requiresAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    body: serializeBody(options.body, headers)
  });

  if (response.status === 401 && shouldRetry && hasRefreshToken()) {
    try {
      const refreshedTokens = await getRefreshedTokens();
      headers.set("Authorization", `Bearer ${refreshedTokens.accessToken}`);

      const retryResponse = await fetch(buildUrl(path), {
        ...options,
        headers,
        body: serializeBody(options.body, headers)
      });

      if (!retryResponse.ok) {
        throw await parseError(retryResponse);
      }

      return parseSuccessResponse<T>(retryResponse);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new AuthSessionExpiredError();
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return parseSuccessResponse<T>(response);
}

async function parseSuccessResponse<T>(response: Response): Promise<T> {
  const payload = await parseResponse<ApiResponse<T> | T>(response);

  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
}

export const httpClient = {
  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return send<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: RequestOptions["body"], options?: Omit<RequestOptions, "method" | "body">) {
    return send<T>(path, { ...options, method: "POST", body });
  },
  put<T>(path: string, body?: RequestOptions["body"], options?: Omit<RequestOptions, "method" | "body">) {
    return send<T>(path, { ...options, method: "PUT", body });
  },
  patch<T>(path: string, body?: RequestOptions["body"], options?: Omit<RequestOptions, "method" | "body">) {
    return send<T>(path, { ...options, method: "PATCH", body });
  },
  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return send<T>(path, { ...options, method: "DELETE" });
  }
};
