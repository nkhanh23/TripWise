import { IntegrationError } from "../../integration/errors";

const authErrorKeys = {
  invalidCredentials: "auth.errors.invalidCredentials",
  userAlreadyRegistered: "auth.errors.userAlreadyRegistered",
  invalidEmail: "auth.errors.invalidEmail",
  weakPassword: "auth.errors.weakPassword",
  emailNotConfirmed: "auth.errors.emailNotConfirmed",
  rateLimited: "auth.errors.rateLimited",
  network: "auth.errors.network",
  timeout: "auth.errors.timeout",
  unauthorized: "auth.errors.sessionExpired",
  sessionExpired: "auth.errors.sessionExpired",
} as const;

export function authErrorTranslationKey(error: unknown): string {
  if (error instanceof IntegrationError && error.code in authErrorKeys) {
    return authErrorKeys[error.code as keyof typeof authErrorKeys];
  }
  return "auth.errors.unknown";
}
