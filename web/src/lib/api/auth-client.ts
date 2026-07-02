import { clearAuthSession, getRefreshToken, setAuthSession } from "./auth-session";
import type { AuthTokens, LoginRequest, RegisterRequest, UserResponse } from "./contracts";
import { httpClient } from "./http-client";

export async function login(request: LoginRequest) {
  const tokens = await httpClient.post<AuthTokens>("/auth/login", request);
  setAuthSession(tokens);
  return tokens;
}

export function register(request: RegisterRequest) {
  return httpClient.post<UserResponse>("/auth/register", request);
}

export async function logout() {
  const refreshToken = getRefreshToken();
  const request = refreshToken ? { refreshToken } : undefined;

  try {
    if (request) {
      await httpClient.post<void>("/auth/logout", request);
    }
  } finally {
    clearAuthSession();
  }
}

export function setSession(tokens: AuthTokens | null) {
  setAuthSession(tokens);
}

export function clearSession() {
  clearAuthSession();
}

export function getCurrentUser() {
  return httpClient.get<UserResponse>("/auth/me", { requiresAuth: true });
}
