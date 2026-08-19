const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  displayName: string;
  confirmPassword: string;
};

export function validateLogin(input: LoginInput): string | null {
  if (!emailPattern.test(input.email.trim())) {
    return 'Nhập địa chỉ email hợp lệ.';
  }
  if (!input.password) {
    return 'Nhập mật khẩu.';
  }
  return null;
}

export function validateRegistration(input: RegisterInput): string | null {
  if (!input.displayName.trim()) {
    return 'Nhập tên hiển thị.';
  }
  const loginError = validateLogin(input);
  if (loginError) {
    return loginError;
  }
  if (input.password.length < minimumPasswordLength) {
    return `Mật khẩu cần có ít nhất ${minimumPasswordLength} ký tự.`;
  }
  if (input.password !== input.confirmPassword) {
    return 'Xác nhận mật khẩu không khớp.';
  }
  return null;
}
