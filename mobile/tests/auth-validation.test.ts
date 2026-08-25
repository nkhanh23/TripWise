import {
  validateLogin,
  validateRegistration,
} from "../src/features/auth/validation";

describe("auth validation", () => {
  it("requires a valid email and password for login", () => {
    expect(
      validateLogin({ email: "not-an-email", password: "password123" }),
    ).toBe("auth.validation.invalidEmail");
    expect(validateLogin({ email: "traveler@example.com", password: "" })).toBe(
      "auth.validation.passwordRequired",
    );
    expect(
      validateLogin({ email: "traveler@example.com", password: "password123" }),
    ).toBeNull();
  });

  it("validates registration display name, password length, and confirmation", () => {
    expect(
      validateRegistration({
        displayName: " ",
        email: "traveler@example.com",
        password: "password123",
        confirmPassword: "password123",
      }),
    ).toBe("auth.validation.nameRequired");
    expect(
      validateRegistration({
        displayName: "Lan",
        email: "traveler@example.com",
        password: "short",
        confirmPassword: "short",
      }),
    ).toBe("auth.validation.passwordTooShort");
    expect(
      validateRegistration({
        displayName: "Lan",
        email: "traveler@example.com",
        password: "password123",
        confirmPassword: "password124",
      }),
    ).toBe("auth.validation.passwordsMismatch");
    expect(
      validateRegistration({
        displayName: "Lan",
        email: "traveler@example.com",
        password: "password123",
        confirmPassword: "password123",
      }),
    ).toBeNull();
  });
});
