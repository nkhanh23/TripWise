import { mapAuthError } from '../src/features/auth/authErrors';

describe('Supabase auth error mapping', () => {
  it('maps known messages without exposing raw internals', () => {
    expect(mapAuthError(new Error('Invalid login credentials'))).toBe('Email hoặc mật khẩu không đúng.');
    expect(mapAuthError(new Error('User already registered'))).toBe('Email này đã được đăng ký. Hãy đăng nhập.');
    expect(mapAuthError(new Error('Failed to fetch'))).toBe('Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.');
  });

  it('uses a safe fallback for unknown errors', () => {
    expect(mapAuthError(new Error('untrusted internal detail'))).toBe('Không thể hoàn tất yêu cầu. Vui lòng thử lại.');
  });
});
