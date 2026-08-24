import { cleanup, render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { EditProfileScreen } from '../src/features/profile/screens/EditProfileScreen';
import { ProfileScreen } from '../src/features/profile/screens/ProfileScreen';
import { TranslationProvider } from '../src/i18n';
import { IntegrationError } from '../src/integration/errors';
import { ThemeProvider } from '../src/theme';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSignOut = jest.fn();
const mockRefreshProfile = jest.fn();
const mockUpdateProfile = jest.fn();
const mockGetStats = jest.fn();

const baseProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  displayName: 'Remote Profile',
  avatarUrl: null,
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z',
};

type MockAuthValue = {
  status: string;
  user: { id: string; email: string; displayName: string };
  profile: typeof baseProfile | null;
  profileStatus: string;
  profileError: null;
  signOut: typeof mockSignOut;
  refreshProfile: typeof mockRefreshProfile;
  updateProfile: typeof mockUpdateProfile;
};

let mockAuthValue: MockAuthValue = {
  status: 'signedIn',
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'remote@example.com',
    displayName: 'Signup Name',
  },
  profile: baseProfile,
  profileStatus: 'ready',
  profileError: null,
  signOut: mockSignOut,
  refreshProfile: mockRefreshProfile,
  updateProfile: mockUpdateProfile,
};

jest.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => mockAuthValue }));
jest.mock('../src/integration/remote/supabaseTripRepositories', () => ({
  SupabaseSavedTripsRepository: jest.fn().mockImplementation(() => ({
    getStats: (...args: unknown[]) => mockGetStats(...args),
  })),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
}));

const editProps = { navigation: { goBack: mockGoBack }, route: {} } as unknown as React.ComponentProps<typeof EditProfileScreen>;

async function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider initialPreference="light">
      <TranslationProvider initialLocale="en">{ui}</TranslationProvider>
    </ThemeProvider>,
  );
}

describe('Profile real RLS composition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStats.mockResolvedValue({ tripsCount: 3, savedPlacesCount: 7 });
    mockAuthValue = {
      ...mockAuthValue,
      status: 'signedIn',
      profileStatus: 'ready',
      profileError: null,
      profile: { ...baseProfile, displayName: 'Remote Profile', avatarUrl: null },
    };
  });
  afterEach(cleanup);

  it('renders real auth/profile fields and owner-scoped remote statistics', async () => {
    await renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('Remote Profile')).toBeTruthy();
    expect(screen.getByText('remote@example.com')).toBeTruthy();
    expect(screen.getByLabelText('Edit profile')).toBeTruthy();
    expect(await screen.findByText('3')).toBeTruthy();
    expect(await screen.findByText('7')).toBeTruthy();
    expect(mockGetStats).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['loading', 'Loading your profile…'],
    ['error', 'Unable to load your profile.'],
    ['absent', 'Your profile record is unavailable.'],
  ])('renders profile state %s', async (profileStatus, message) => {
    mockAuthValue = { ...mockAuthValue, profileStatus, profile: null };
    await renderWithProviders(<ProfileScreen />);
    expect(screen.getByText(message)).toBeTruthy();
    if (profileStatus !== 'loading') {
      const user = userEvent.setup();
      await user.press(screen.getByLabelText('Retry profile'));
      expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    }
  });

  it('signs out only after confirmation and keeps the app signed in on failure', async () => {
    mockSignOut.mockRejectedValueOnce(new IntegrationError('network'));
    const user = userEvent.setup();
    await renderWithProviders(<ProfileScreen />);
    await user.press(screen.getByLabelText('Sign out'));
    await user.press(screen.getAllByLabelText('Sign out')[1]);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Unable to sign out. Please try again.')).toBeTruthy();
  });

  it('updates the current Stitch edit-profile fields and reconciles before success confirmation', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderWithProviders(<EditProfileScreen {...editProps} />);
    const name = screen.getByDisplayValue('Remote Profile');
    await user.clear(name);
    await user.type(name, 'Updated Remote Name');
    const homeCountry = screen.getByLabelText('Home country');
    await user.type(homeCountry, 'VN');
    await user.press(screen.getByLabelText('Save changes'));
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      displayName: 'Updated Remote Name',
      homeCountry: 'VN',
      avatarUrl: null,
    });
    expect(alert).toHaveBeenCalledWith('Success', 'Profile updated successfully', expect.any(Array));
    expect(mockGoBack).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('does not report success after a failed profile update', async () => {
    mockUpdateProfile.mockRejectedValue(new IntegrationError('network'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderWithProviders(<EditProfileScreen {...editProps} />);
    await user.press(screen.getByLabelText('Save changes'));
    expect(await screen.findByText('Unable to connect. Check your network and try again.')).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
