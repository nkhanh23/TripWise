import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../src/features/auth/screens/LoginScreen';

const mockSignIn = jest.fn();

jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

describe('LoginScreen', () => {
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

  it('renders form fields, labels, and links', async () => {
    await render(<LoginScreen navigation={navigationProps} route={{} as any} />);

    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByPlaceholderText('name@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    expect(screen.getByText('Forgot password?')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(screen.getByText('Continue with Google')).toBeTruthy();
    expect(screen.getByText('Create one')).toBeTruthy();
  });

  it('validates empty inputs on submit', async () => {
    const user = userEvent.setup();
    await render(<LoginScreen navigation={navigationProps} route={{} as any} />);

    await user.press(screen.getByLabelText('Đăng nhập'));
    await waitFor(() => {
      expect(screen.getByText('Nhập địa chỉ email hợp lệ.')).toBeTruthy();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signIn on valid submit', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<LoginScreen navigation={navigationProps} route={{} as any} />);

    await user.type(screen.getByPlaceholderText('name@example.com'), 'traveler@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await user.press(screen.getByLabelText('Đăng nhập'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('traveler@example.com', 'password123');
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    await render(<LoginScreen navigation={navigationProps} route={{} as any} />);

    expect(screen.getByText('Show')).toBeTruthy();
    await user.press(screen.getByLabelText('Hiện mật khẩu'));
    expect(screen.getByText('Hide')).toBeTruthy();
  });

  it('navigates to ForgotPassword and Register', async () => {
    const user = userEvent.setup();
    await render(<LoginScreen navigation={navigationProps} route={{} as any} />);

    await user.press(screen.getByLabelText('Quên mật khẩu'));
    expect(navigateMock).toHaveBeenCalledWith('ForgotPassword');

    await user.press(screen.getByLabelText('Đăng ký tài khoản'));
    expect(navigateMock).toHaveBeenCalledWith('Register');
  });
});
