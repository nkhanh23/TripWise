import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { RegisterScreen } from '../src/features/auth/screens/RegisterScreen';

const mockSignUp = jest.fn();

jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
  }),
}));

describe('RegisterScreen', () => {
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

  it('renders registration form fields and labels', async () => {
    await render(<RegisterScreen navigation={navigationProps} route={{} as any} />);

    expect(screen.getByText('Create your account')).toBeTruthy();
    expect(screen.getByText('TripWise')).toBeTruthy();
    expect(screen.getByText('Full Name')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByText('Confirm Password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Jane Doe')).toBeTruthy();
    expect(screen.getByPlaceholderText('jane@example.com')).toBeTruthy();
    expect(screen.getAllByPlaceholderText('••••••••')).toHaveLength(2);
    expect(screen.getByText('Create account')).toBeTruthy();
    expect(screen.getByText('Continue with Google')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('validates empty and mismatched password inputs', async () => {
    const user = userEvent.setup();
    await render(<RegisterScreen navigation={navigationProps} route={{} as any} />);

    await user.press(screen.getByLabelText('Tạo tài khoản'));
    await waitFor(() => {
      expect(screen.getByText('Nhập tên hiển thị.')).toBeTruthy();
    });

    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Lan Nguyen');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'lan@example.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwordInputs[0], 'password123');
    await user.type(passwordInputs[1], 'password999');
    await user.press(screen.getByLabelText('Tạo tài khoản'));

    await waitFor(() => {
      expect(screen.getByText('Xác nhận mật khẩu không khớp.')).toBeTruthy();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp on valid submit', async () => {
    mockSignUp.mockResolvedValue({ confirmationRequired: false });
    const user = userEvent.setup();
    await render(<RegisterScreen navigation={navigationProps} route={{} as any} />);

    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Lan Nguyen');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'lan@example.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwordInputs[0], 'password123');
    await user.type(passwordInputs[1], 'password123');
    await user.press(screen.getByLabelText('Tạo tài khoản'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('Lan Nguyen', 'lan@example.com', 'password123');
    });
  });

  it('navigates to Login when Sign in link is pressed', async () => {
    const user = userEvent.setup();
    await render(<RegisterScreen navigation={navigationProps} route={{} as any} />);

    await user.press(screen.getByLabelText('Đăng nhập'));
    expect(navigateMock).toHaveBeenCalledWith('Login');
  });
});
