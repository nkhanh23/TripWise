import type { AuthenticatedUser, Profile } from "../../integration/contracts";
import type { IntegrationErrorCode } from "../../integration/errors";

export type AuthStatus = "bootstrapping" | "signedOut" | "signedIn";
export type ProfileStatus = "idle" | "loading" | "ready" | "absent" | "error";

export type AuthState = {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  profile: Profile | null;
  profileStatus: ProfileStatus;
  profileError: IntegrationErrorCode | null;
};

export type SignUpResult = { confirmationRequired: boolean };
