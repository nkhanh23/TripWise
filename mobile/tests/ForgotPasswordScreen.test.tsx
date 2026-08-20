import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { ForgotPasswordScreen } from '../src/features/auth/screens/ForgotPasswordScreen';

describe('ForgotPasswordScreen', () => {
  const navigateMock = jest.fn();
  const goBackMock = jest.fn();
  const navigationProps: any = {
    navigate: navigateMock,
    canGoBack: jest.fn().mockReturnValue(true),
    goBack: goBackMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders initial form state correctly', async () => {
    await render(<ForgotPasswordScreen navigation={navigationProps} route={{} as any} />);

    expect(screen.getByText('Reset password')).toBeTruthy();
    expect(screen.getByPlaceholderText('name@example.com')).toBeTruthy();
    expect(screen.getByText('Send reset link')).toBeTruthy();
  });

  it('shows validation error for empty or invalid email', async () => {
    const user = userEvent.setup();
    await render(<ForgotPasswordScreen navigation={navigationProps} route={{} as any} />);

    await user.press(screen.getByLabelText('Gửi liên kết đặt lại mật khẩu'));
    await waitFor(() => {
      expect(screen.getByText('Nhập địa chỉ email hợp lệ.')).toBeTruthy();
    });

    await user.type(screen.getByPlaceholderText('name@example.com'), 'invalid-email');
    await user.press(screen.getByLabelText('Gửi liên kết đặt lại mật khẩu'));
    await waitFor(() => {
      expect(screen.getByText('Nhập địa chỉ email hợp lệ.')).toBeTruthy();
    });
  });

  it('transitions to success state on valid email submission', async () => {
    const user = userEvent.setup();
    await render(<ForgotPasswordScreen navigation={navigationProps} route={{} as any} />);

    await user.type(screen.getByPlaceholderText('name@example.com'), 'traveler@example.com');
    await user.press(screen.getByLabelText('Gửi liên kết đặt lại mật khẩu'));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeTruthy();
      expect(screen.getByText('Back to sign in')).toBeTruthy();
    });

    await user.press(screen.getByLabelText('Quay lại đăng nhập'));
    expect(navigateMock).toHaveBeenCalledWith('Login');
  });

  it('handles back button navigation', async () => {
    const user = userEvent.setup();
    await render(<ForgotPasswordScreen navigation={navigationProps} route={{} as any} />);

    await user.press(screen.getByLabelText('Quay lại'));
    expect(goBackMock).toHaveBeenCalled();
  });
});
