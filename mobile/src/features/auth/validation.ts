const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

export type AuthValidationKey =
  | "auth.validation.invalidEmail"
  | "auth.validation.passwordRequired"
  | "auth.validation.nameRequired"
  | "auth.validation.passwordTooShort"
  | "auth.validation.passwordsMismatch";

export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & {
  displayName: string;
  confirmPassword: string;
};

export function validateLogin(input: LoginInput): AuthValidationKey | null {
  if (!emailPattern.test(input.email.trim()))
    return "auth.validation.invalidEmail";
  if (!input.password) return "auth.validation.passwordRequired";
  return null;
}

export function validateRegistration(
  input: RegisterInput,
): AuthValidationKey | null {
  if (!input.displayName.trim()) return "auth.validation.nameRequired";
  const loginError = validateLogin(input);
  if (loginError) return loginError;
  if (input.password.length < minimumPasswordLength)
    return "auth.validation.passwordTooShort";
  if (input.password !== input.confirmPassword)
    return "auth.validation.passwordsMismatch";
  return null;
}
