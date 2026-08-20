import { fireEvent, render } from '@testing-library/react-native';
import { WelcomeScreen } from '../src/features/auth/screens/WelcomeScreen';

describe('WelcomeScreen', () => {
  const navigateMock = jest.fn();
  const navigationProps: any = {
    navigate: navigateMock,
    canGoBack: jest.fn().mockReturnValue(false),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders branding, heading, and action buttons', async () => {
    const { getByText } = await render(<WelcomeScreen navigation={navigationProps} route={{} as any} />);

    expect(getByText('TripWise')).toBeTruthy();
    expect(getByText('Plan trips your way')).toBeTruthy();
    expect(getByText('Get started')).toBeTruthy();
    expect(getByText('I already have an account')).toBeTruthy();
  });

  it('navigates to Register when "Get started" is pressed', async () => {
    const { getByText } = await render(<WelcomeScreen navigation={navigationProps} route={{} as any} />);

    fireEvent.press(getByText('Get started'));
    expect(navigateMock).toHaveBeenCalledWith('Register');
  });

  it('navigates to Login when "I already have an account" is pressed', async () => {
    const { getByText } = await render(<WelcomeScreen navigation={navigationProps} route={{} as any} />);

    fireEvent.press(getByText('I already have an account'));
    expect(navigateMock).toHaveBeenCalledWith('Login');
  });
});
