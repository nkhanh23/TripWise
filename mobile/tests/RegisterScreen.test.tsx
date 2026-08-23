import { act, cleanup, render, screen, userEvent } from '@testing-library/react-native';

import { RegisterScreen } from '../src/features/auth/screens/RegisterScreen';
import { IntegrationError } from '../src/integration/errors';

const mockSignUp = jest.fn();
jest.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ signUp: mockSignUp }) }));

const navigation = {
  navigate: jest.fn(), canGoBack: jest.fn(() => true), goBack: jest.fn(),
} as never;

describe('RegisterScreen real-auth composition', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(cleanup);

  async function fillAndSubmit() {
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Lan Nguyen');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'lan@example.com');
    const passwords = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwords[0], 'password123');
    await user.type(passwords[1], 'password123');
    await user.press(screen.getByLabelText('Tạo tài khoản'));
    return user;
  }

  it('validates input before calling the repository', async () => {
    const user = userEvent.setup();
    await render(<RegisterScreen navigation={navigation} route={{} as never} />);
    await user.press(screen.getByLabelText('Tạo tài khoản'));
    expect(await screen.findByText('Please enter your name.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it.each([false, true])('handles nullable signup session; confirmationRequired=%s', async (confirmationRequired) => {
    mockSignUp.mockResolvedValue({ confirmationRequired });
    await render(<RegisterScreen navigation={navigation} route={{} as never} />);
    await fillAndSubmit();
    expect(mockSignUp).toHaveBeenCalledWith('Lan Nguyen', 'lan@example.com', 'password123');
    if (confirmationRequired) {
      expect(await screen.findByText('Account created. Check your email before signing in.')).toBeTruthy();
    }
  });

  it('shows duplicate-email and provider failures safely', async () => {
    mockSignUp.mockRejectedValue(new IntegrationError('userAlreadyRegistered'));
    await render(<RegisterScreen navigation={navigation} route={{} as never} />);
    await fillAndSubmit();
    expect(await screen.findByText('This email is already registered. Try signing in.')).toBeTruthy();
  });

  it.each([
    ['rateLimited', 'Too many attempts. Please wait and try again.'],
    ['network', 'Unable to connect. Check your network and try again.'],
  ] as const)('maps %s failures to safe localized copy', async (code, expectedMessage) => {
    mockSignUp.mockRejectedValue(new IntegrationError(code));
    await render(<RegisterScreen navigation={navigation} route={{} as never} />);
    await fillAndSubmit();
    expect(await screen.findByText(expectedMessage)).toBeTruthy();
  });

  it('prevents repeated submission while public signup is pending', async () => {
    let resolveSignUp: ((value: { confirmationRequired: boolean }) => void) | undefined;
    mockSignUp.mockImplementation(() => new Promise((resolve) => { resolveSignUp = resolve; }));
    await render(<RegisterScreen navigation={navigation} route={{} as never} />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Lan Nguyen');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'lan@example.com');
    const passwords = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwords[0], 'password123');
    await user.type(passwords[1], 'password123');

    const submitButton = screen.getByLabelText('Tạo tài khoản');
    await user.press(submitButton);
    await user.press(submitButton);
    expect(mockSignUp).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSignUp?.({ confirmationRequired: false });
      await Promise.resolve();
    });
  });
});
