import type { AuthTokens } from "./contracts";

const STORAGE_KEY = "tripwise.auth.session";

let sessionCache: AuthTokens | null = null;

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
