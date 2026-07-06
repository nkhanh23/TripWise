import type { AuthTokens } from "./contracts";

const STORAGE_KEY = "tripwise.auth.session";

let sessionCache: AuthTokens | null = null;

export type AuthJwtClaims = {
  sub?: string;
  userId?: number | string;
  email?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
};

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function normalizeTokens(tokens: AuthTokens): AuthTokens {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType || "Bearer",
    expiresIn: tokens.expiresIn
  };
}

function persistSession(tokens: AuthTokens | null) {
  if (!canUseSessionStorage()) {
    return;
  }

  if (tokens === null) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function getAuthSession(): AuthTokens | null {
  if (sessionCache !== null) {
    return sessionCache;
  }

  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    sessionCache = normalizeTokens(JSON.parse(rawValue) as AuthTokens);
    return sessionCache;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setAuthSession(tokens: AuthTokens | null) {
  sessionCache = tokens ? normalizeTokens(tokens) : null;
  persistSession(sessionCache);
}

export function clearAuthSession() {
  setAuthSession(null);
}

export function getAccessToken() {
  return getAuthSession()?.accessToken ?? null;
}

export function getRefreshToken() {
  return getAuthSession()?.refreshToken ?? null;
}

export function hasRefreshToken() {
  return getRefreshToken() !== null;
}

function decodeBase64Url(value: string) {
  if (typeof window === "undefined" || typeof window.atob !== "function") {
    return null;
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), "=");

  try {
    return window.atob(padded);
  } catch {
    return null;
  }
}

export function getAuthJwtClaims(): AuthJwtClaims | null {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return null;
  }

  const segments = accessToken.split(".");
  if (segments.length < 2) {
    return null;
  }

  const decodedPayload = decodeBase64Url(segments[1]);
  if (!decodedPayload) {
    return null;
  }

  try {
    return JSON.parse(decodedPayload) as AuthJwtClaims;
  } catch {
    return null;
  }
}

export function getAuthRoles(): string[] {
  const claims = getAuthJwtClaims();
  if (!claims) {
    return [];
  }

  if (Array.isArray(claims.roles)) {
    return claims.roles.filter((role): role is string => typeof role === "string");
  }

  if (typeof claims.role === "string" && claims.role.length > 0) {
    return [claims.role];
  }

  return [];
}
