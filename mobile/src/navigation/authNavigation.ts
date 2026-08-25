import type { AuthStatus } from "../features/auth/types";

export type AuthNavigationTarget = "bootstrap" | "auth" | "app";

export function getAuthNavigationTarget(
  status: AuthStatus,
): AuthNavigationTarget {
  if (status === "bootstrapping") return "bootstrap";
  return status === "signedIn" ? "app" : "auth";
}
