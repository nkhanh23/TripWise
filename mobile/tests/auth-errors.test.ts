import { authErrorTranslationKey } from "../src/features/auth/authErrors";
import { IntegrationError, mapAuthError } from "../src/integration/errors";

describe("Supabase auth error mapping", () => {
  it.each([
    ["invalid_credentials", "invalidCredentials"],
    ["email_not_confirmed", "emailNotConfirmed"],
    ["user_already_exists", "userAlreadyRegistered"],
    ["email_address_invalid", "invalidEmail"],
    ["weak_password", "weakPassword"],
    ["refresh_token_not_found", "sessionExpired"],
  ])(
    "maps provider code %s to semantic code %s",
    (remoteCode, semanticCode) => {
      expect(mapAuthError({ code: remoteCode }).code).toBe(semanticCode);
    },
  );

  it("maps semantic errors to centralized translation keys", () => {
    expect(
      authErrorTranslationKey(new IntegrationError("invalidCredentials")),
    ).toBe("auth.errors.invalidCredentials");
    expect(authErrorTranslationKey(new Error("raw provider internals"))).toBe(
      "auth.errors.unknown",
    );
  });
});
