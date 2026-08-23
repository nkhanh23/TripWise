import { cleanup, render, screen, userEvent } from '@testing-library/react-native';

import { ForgotPasswordScreen } from '../src/features/auth/screens/ForgotPasswordScreen';
import { IntegrationError } from '../src/integration/errors';

const mockResetPassword = jest.fn();
jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({ resetPassword: mockResetPassword }),
}));

const navigation = {
  navigate: jest.fn(), canGoBack: jest.fn(() => true), goBack: jest.fn(),
} as never;

describe('ForgotPasswordScreen real-auth composition', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(cleanup);

  it('does not fake success when the Supabase reset call fails', async () => {
    mockResetPassword.mockRejectedValue(new IntegrationError('network'));
    const user = userEvent.setup();
    await render(<ForgotPasswordScreen navigation={navigation} route={{} as never} />);
    await user.type(screen.getByPlaceholderText('name@example.com'), 'traveler@example.com');
    await user.press(screen.getByLabelText('Gửi liên kết đặt lại mật khẩu'));
    expect(await screen.findByText('Unable to connect. Check your network and try again.')).toBeTruthy();
    expect(screen.queryByText('Check your email')).toBeNull();
  });

  it('shows check-email only after the repository succeeds', async () => {
    mockResetPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<ForgotPasswordScreen navigation={navigation} route={{} as never} />);
    await user.type(screen.getByPlaceholderText('name@example.com'), 'traveler@example.com');
    await user.press(screen.getByLabelText('Gửi liên kết đặt lại mật khẩu'));
    expect(mockResetPassword).toHaveBeenCalledWith('traveler@example.com');
    expect(await screen.findByText('Check your email')).toBeTruthy();
  });
});
