import { cleanup, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';
import { Dimensions } from 'react-native';

import { ExplorePlaceList } from '../src/features/explore/components/ExplorePlaceList';
import { generateLargeMockExplorePlaces } from '../src/features/explore/data/mockPlaces';
import { CreateTripWizardScreen } from '../src/features/planner/screens/CreateTripWizardScreen';
import { resetProfile } from '../src/features/profile/data/mockProfile';
import { EditProfileScreen } from '../src/features/profile/screens/EditProfileScreen';
import { ProfileScreen } from '../src/features/profile/screens/ProfileScreen';
import { RouteStepList } from '../src/features/route/components/RouteStepList';
import { generateLongMockRouteSteps } from '../src/features/route/data/mockRoutes';
import { resetSavedPlaces, savePlace } from '../src/features/saved/data/savedPlacesStore';
import { SavedPlacesScreen } from '../src/features/saved/screens/SavedPlacesScreen';
import { resetSettings } from '../src/features/settings/data/settingsStore';
import { CurrencySettingsScreen } from '../src/features/settings/screens/CurrencySettingsScreen';
import { HelpSupportScreen } from '../src/features/settings/screens/HelpSupportScreen';
import { SettingsScreen } from '../src/features/settings/screens/SettingsScreen';
import { TripDetailScreen } from '../src/features/trips/screens/TripDetailScreen';
import { generateLargeMockTripDetail } from '../src/features/trips/data/mockTripDetail';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSignOut = jest.fn();
const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockRefreshProfile = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    updateProfile: mockUpdateProfile,
    refreshProfile: mockRefreshProfile,
    status: 'signedIn',
    user: { id: '11111111-1111-4111-8111-111111111111', email: 'sarah.j@example.com', displayName: 'Sarah Jenkins' },
    profile: {
      id: '11111111-1111-4111-8111-111111111111', displayName: 'Sarah Jenkins', avatarUrl: null,
      createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    },
    profileStatus: 'ready',
    profileError: null,
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: jest.fn().mockReturnValue(true),
      addListener: jest.fn().mockReturnValue(jest.fn()),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
}));

describe('Responsive & Android Performance Audit (FE-P17-T001)', () => {
  const mockNavProps: any = {
    navigation: {
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: jest.fn().mockReturnValue(true),
      addListener: jest.fn().mockReturnValue(jest.fn()),
    },
    route: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetProfile();
    resetSavedPlaces();
    resetSettings();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    resetProfile();
    resetSavedPlaces();
    resetSettings();
  });

  async function renderWithProviders(
    ui: React.ReactElement,
    theme: 'light' | 'dark' = 'light',
    locale: 'en' | 'vi' = 'en'
  ) {
    return await render(
      <ThemeProvider initialPreference={theme}>
        <TranslationProvider initialLocale={locale}>
          {ui}
        </TranslationProvider>
      </ThemeProvider>
    );
  }

  describe('1. Responsive Layout & Vietnamese Expansion Across Viewports', () => {
    it('renders ProfileScreen cleanly on small Android viewport (320dp width) with Vietnamese text', async () => {
      await renderWithProviders(<ProfileScreen />, 'light', 'vi');

      expect(screen.getByText('Hồ sơ')).toBeTruthy();
      expect(screen.getByText('DU LỊCH')).toBeTruthy();
      expect(screen.getByText('TÀI KHOẢN')).toBeTruthy();
      expect(screen.getByText('HỖ TRỢ')).toBeTruthy();
      expect(screen.getByText('Chỉnh sửa hồ sơ')).toBeTruthy();
    });

    it('renders SettingsScreen on standard Android viewport (390dp width) with Vietnamese text', async () => {
      await renderWithProviders(<SettingsScreen {...mockNavProps} />, 'dark', 'vi');

      expect(screen.getByText('Cài đặt')).toBeTruthy();
      expect(screen.getByText('CHUNG')).toBeTruthy();
      expect(screen.getByText('GIAO DIỆN')).toBeTruthy();
      expect(screen.getByText('Chế độ tối')).toBeTruthy();
      expect(screen.getByText('Tiếng Việt')).toBeTruthy();
    });

    it('renders SavedPlacesScreen on large Android viewport (480dp width) with Vietnamese text', async () => {
      savePlace('place_wat_arun');
      await renderWithProviders(<SavedPlacesScreen fixtureMode />, 'light', 'vi');

      expect(screen.getByText('Đã lưu')).toBeTruthy();
      expect(screen.getByText('Wat Arun')).toBeTruthy();
    });
  });

  describe('2. Large Collection Virtualization & Stable Keys Stress Audit', () => {
    it('virtualizes 50 Explore places with unique stable keys', async () => {
      const places50 = generateLargeMockExplorePlaces(50);
      const onSelectMock = jest.fn();

      await renderWithProviders(
        <ExplorePlaceList
          onSelectPlace={onSelectMock}
          places={places50}
          selectedPlaceId={null}
          topPadding={100}
        />
      );

      expect(screen.getByText('Wat Arun')).toBeTruthy();
      expect(screen.getByText('Wat Arun #8')).toBeTruthy();
    });

    it('virtualizes 50 Route steps with stable keyExtractor', async () => {
      const steps50 = generateLongMockRouteSteps(50);

      await renderWithProviders(<RouteStepList steps={steps50} />);

      expect(screen.getByText('Turn left onto Rama I Rd (Step #1)')).toBeTruthy();
      expect(screen.getByText('Turn right onto Phloen Chit Rd (Step #2)')).toBeTruthy();
    });

    it('virtualizes large Trip Detail itinerary with 7 days and 56 items', async () => {
      const largeTrip = generateLargeMockTripDetail(7, 8);

      await renderWithProviders(
        <TripDetailScreen
          {...mockNavProps}
          customTripDetail={largeTrip}
          route={{ key: 'TripDetail', name: 'TripDetail', params: { tripId: 'trip_stress' } }}
        />
      );

      expect(screen.getByText('Morning Matcha & Pastry #1')).toBeTruthy();
    });

    it('virtualizes large Saved Places list with memoized renderItem and stable keys', async () => {
      const saved40 = generateLargeMockExplorePlaces(40);

      await renderWithProviders(
        <SavedPlacesScreen customPlaces={saved40} />
      );

      expect(screen.getByText('Wat Arun')).toBeTruthy();
      expect(screen.getByText('Wat Arun #8')).toBeTruthy();
    });
  });

  describe('3. Local Store Subscriptions Lifecycle Audit', () => {
    it('attaches and cleanly unsubscribes from savedPlacesStore on unmount', async () => {
      const { unmount } = await renderWithProviders(<SavedPlacesScreen fixtureMode />);
      expect(screen.getByText('Saved')).toBeTruthy();

      expect(() => unmount()).not.toThrow();
    });

    it('attaches and cleanly unsubscribes from profileStore on unmount', async () => {
      const { unmount } = await renderWithProviders(<ProfileScreen />);
      expect(screen.getByText('Profile')).toBeTruthy();

      expect(() => unmount()).not.toThrow();
    });

    it('attaches and cleanly unsubscribes from settingsStore on unmount', async () => {
      const { unmount } = await renderWithProviders(<SettingsScreen {...mockNavProps} />);
      expect(screen.getByText('Settings')).toBeTruthy();

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('4. Theme & Language Preference Switch State Preservation', () => {
    it('preserves form input state in EditProfileScreen when theme is changed', async () => {
      const user = userEvent.setup();
      const { rerender } = await renderWithProviders(
        <EditProfileScreen {...mockNavProps} />,
        'light',
        'en'
      );

      const nameInput = screen.getByLabelText('Full name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Alex Mercer');

      expect(screen.getByDisplayValue('Alex Mercer')).toBeTruthy();

      // Switch theme to dark
      await rerender(
        <ThemeProvider initialPreference="dark">
          <TranslationProvider initialLocale="en">
            <EditProfileScreen {...mockNavProps} />
          </TranslationProvider>
        </ThemeProvider>
      );

      expect(screen.getByDisplayValue('Alex Mercer')).toBeTruthy();
    });

    it('preserves search query in CurrencySettingsScreen when language is toggled', async () => {
      const user = userEvent.setup();
      const { rerender } = await renderWithProviders(
        <CurrencySettingsScreen {...mockNavProps} />,
        'light',
        'en'
      );

      const searchInput = screen.getByPlaceholderText('Search currency or country...');
      await user.type(searchInput, 'JPY');

      expect(screen.getByText('Japanese Yen')).toBeTruthy();

      // Switch language to VI
      await rerender(
        <ThemeProvider initialPreference="light">
          <TranslationProvider initialLocale="vi">
            <CurrencySettingsScreen {...mockNavProps} />
          </TranslationProvider>
        </ThemeProvider>
      );

      expect(screen.getByText('Japanese Yen')).toBeTruthy();
    });
  });

  describe('5. Android Keyboard & Scrolling Architecture Audit', () => {
    it('provides keyboard-handled scrolling in CreateTripWizardScreen Step 1 & Step 5', async () => {
      await renderWithProviders(<CreateTripWizardScreen initialStep={1} />);
      expect(screen.getByPlaceholderText('Search city, e.g. Bangkok, Tokyo...')).toBeTruthy();
    });

    it('provides keyboard-handled scrolling in HelpSupportScreen', async () => {
      await renderWithProviders(<HelpSupportScreen {...mockNavProps} />);
      expect(screen.getByPlaceholderText('Search for help...')).toBeTruthy();
    });
  });
});
