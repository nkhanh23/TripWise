export function mapAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu không đúng.';
  }
  if (message.includes('email not confirmed')) {
    return 'Hãy xác nhận email trước khi đăng nhập.';
  }
  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'Email này đã được đăng ký. Hãy đăng nhập.';
  }
  if (message.includes('invalid email')) {
    return 'Địa chỉ email không hợp lệ.';
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('least'))) {
    return 'Mật khẩu chưa đáp ứng yêu cầu bảo mật.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.';
  }
  return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}
