import { validateLogin, validateRegistration } from '../src/features/auth/validation';

describe('auth validation', () => {
  it('requires a valid email and password for login', () => {
    expect(validateLogin({ email: 'not-an-email', password: 'password123' })).toBe('Nhập địa chỉ email hợp lệ.');
    expect(validateLogin({ email: 'traveler@example.com', password: '' })).toBe('Nhập mật khẩu.');
    expect(validateLogin({ email: 'traveler@example.com', password: 'password123' })).toBeNull();
  });

  it('validates registration display name, password length, and confirmation', () => {
    expect(validateRegistration({ displayName: ' ', email: 'traveler@example.com', password: 'password123', confirmPassword: 'password123' })).toBe('Nhập tên hiển thị.');
    expect(validateRegistration({ displayName: 'Lan', email: 'traveler@example.com', password: 'short', confirmPassword: 'short' })).toBe('Mật khẩu cần có ít nhất 8 ký tự.');
    expect(validateRegistration({ displayName: 'Lan', email: 'traveler@example.com', password: 'password123', confirmPassword: 'password124' })).toBe('Xác nhận mật khẩu không khớp.');
    expect(validateRegistration({ displayName: 'Lan', email: 'traveler@example.com', password: 'password123', confirmPassword: 'password123' })).toBeNull();
  });
});
