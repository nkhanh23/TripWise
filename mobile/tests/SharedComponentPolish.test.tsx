import { cleanup, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { resetProfile } from '../src/features/profile/data/mockProfile';
import { EditProfileScreen } from '../src/features/profile/screens/EditProfileScreen';
import { ProfileScreen } from '../src/features/profile/screens/ProfileScreen';
import { resetSavedPlaces } from '../src/features/saved/data/savedPlacesStore';
import { SavedPlacesScreen } from '../src/features/saved/screens/SavedPlacesScreen';
import { PlaceDetailScreen } from '../src/features/place/screens/PlaceDetailScreen';
import { CreateTripWizardScreen } from '../src/features/planner/screens/CreateTripWizardScreen';
import { RoutePreviewScreen } from '../src/features/route/screens/RoutePreviewScreen';
import { TripDetailScreen } from '../src/features/trips/screens/TripDetailScreen';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSignOut = jest.fn();
const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockRefreshProfile = jest.fn().mockResolvedValue(undefined);

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockComponent = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: MockComponent,
    Marker: MockComponent,
    Polyline: MockComponent,
    Callout: MockComponent,
  };
});

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

describe('Shared Component Polish & State Completeness (FE-P16-T001)', () => {
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
  });

  afterEach(() => {
    cleanup();
    resetProfile();
    resetSavedPlaces();
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

  describe('1. Loading States Audit', () => {
    it('renders localized loading indicator in PlaceDetailScreen', async () => {
      await renderWithProviders(
        <PlaceDetailScreen
          {...mockNavProps}
          initialStatus="loading"
          route={{ key: 'PlaceDetail', name: 'PlaceDetail', params: { placeId: 'place_wat_arun' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByLabelText('Loading…')).toBeTruthy();
    });

    it('renders localized loading indicator in PlaceDetailScreen in Vietnamese', async () => {
      await renderWithProviders(
        <PlaceDetailScreen
          {...mockNavProps}
          initialStatus="loading"
          route={{ key: 'PlaceDetail', name: 'PlaceDetail', params: { placeId: 'place_wat_arun' } }}
        />,
        'light',
        'vi'
      );
      expect(screen.getByLabelText('Đang tải...')).toBeTruthy();
    });

    it('renders localized loading indicator in RoutePreviewScreen', async () => {
      await renderWithProviders(
        <RoutePreviewScreen
          {...mockNavProps}
          initialStatus="loading"
          route={{ key: 'RoutePreview', name: 'RoutePreview', params: { destinationId: 'place_wat_arun' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByLabelText('Loading…')).toBeTruthy();
    });

    it('renders localized loading indicator in TripDetailScreen', async () => {
      await renderWithProviders(
        <TripDetailScreen
          {...mockNavProps}
          initialStatus="loading"
          route={{ key: 'TripDetail', name: 'TripDetail', params: { tripId: 'trip_bangkok' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByLabelText('Loading…')).toBeTruthy();
    });
  });

  describe('2. Error States Audit & Recovery', () => {
    it('renders localized error state and retry in PlaceDetailScreen (EN)', async () => {
      const user = userEvent.setup();
      await renderWithProviders(
        <PlaceDetailScreen
          {...mockNavProps}
          initialStatus="error"
          route={{ key: 'PlaceDetail', name: 'PlaceDetail', params: { placeId: 'place_wat_arun' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByText('Unable to load place details')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();

      await user.press(screen.getByText('Retry'));
      expect(screen.getByText('About')).toBeTruthy();
    });

    it('renders localized error state and retry in PlaceDetailScreen (VI)', async () => {
      await renderWithProviders(
        <PlaceDetailScreen
          {...mockNavProps}
          initialStatus="error"
          route={{ key: 'PlaceDetail', name: 'PlaceDetail', params: { placeId: 'place_wat_arun' } }}
        />,
        'light',
        'vi'
      );
      expect(screen.getByText('Không thể tải thông tin địa điểm')).toBeTruthy();
      expect(screen.getByText('Thử lại')).toBeTruthy();
    });

    it('renders localized error state and retry in RoutePreviewScreen (EN)', async () => {
      await renderWithProviders(
        <RoutePreviewScreen
          {...mockNavProps}
          initialStatus="error"
          route={{ key: 'RoutePreview', name: 'RoutePreview', params: { destinationId: 'place_wat_arun' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByText('Unable to calculate route')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('renders localized error state and retry in RoutePreviewScreen (VI)', async () => {
      await renderWithProviders(
        <RoutePreviewScreen
          {...mockNavProps}
          initialStatus="error"
          route={{ key: 'RoutePreview', name: 'RoutePreview', params: { destinationId: 'place_wat_arun' } }}
        />,
        'light',
        'vi'
      );
      expect(screen.getByText('Không thể tính toán lộ trình')).toBeTruthy();
      expect(screen.getByText('Thử lại')).toBeTruthy();
    });

    it('renders localized error state and retry in TripDetailScreen (EN)', async () => {
      await renderWithProviders(
        <TripDetailScreen
          {...mockNavProps}
          initialStatus="error"
          route={{ key: 'TripDetail', name: 'TripDetail', params: { tripId: 'trip_bangkok' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByText('Unable to load trip details')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('renders localized error state and retry in TripDetailScreen (VI)', async () => {
      await renderWithProviders(
        <TripDetailScreen
          {...mockNavProps}
          initialStatus="error"
          route={{ key: 'TripDetail', name: 'TripDetail', params: { tripId: 'trip_bangkok' } }}
        />,
        'light',
        'vi'
      );
      expect(screen.getByText('Không thể tải chi tiết chuyến đi')).toBeTruthy();
      expect(screen.getByText('Thử lại')).toBeTruthy();
    });
  });

  describe('3. Not-Found & Unhandled Local ID Recovery', () => {
    it('renders not-found state with back button when place is not found', async () => {
      const user = userEvent.setup();
      await renderWithProviders(
        <PlaceDetailScreen
          {...mockNavProps}
          initialStatus="not-found"
          route={{ key: 'PlaceDetail', name: 'PlaceDetail', params: { placeId: 'place_wat_arun' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByText('Place not found')).toBeTruthy();
      expect(screen.getByText('The requested place does not exist in our directory.')).toBeTruthy();

      await user.press(screen.getByText('Back'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('renders not-found state with back button when trip is not found', async () => {
      const user = userEvent.setup();
      await renderWithProviders(
        <TripDetailScreen
          {...mockNavProps}
          initialStatus="not_found"
          route={{ key: 'TripDetail', name: 'TripDetail', params: { tripId: 'trip_bangkok' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByText('Trip not found')).toBeTruthy();
      expect(screen.getByText('The requested trip could not be found in your account.')).toBeTruthy();

      await user.press(screen.getByText('Back to Trips'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Form Validation & Localized Error Messages', () => {
    it('validates required destination in CreateTripWizardScreen in EN', async () => {
      const user = userEvent.setup();

      await renderWithProviders(
        <CreateTripWizardScreen
          initialState={{ destination: null, customDestinationName: '' }}
          initialStep={1}
        />,
        'light',
        'en'
      );
      const continueBtn = screen.getByText('Continue');
      await user.press(continueBtn);
      expect(screen.getByText('Please select or enter a destination for your trip.')).toBeTruthy();
    });

    it('validates required destination in CreateTripWizardScreen in VI', async () => {
      const user = userEvent.setup();

      await renderWithProviders(
        <CreateTripWizardScreen
          initialState={{ destination: null, customDestinationName: '' }}
          initialStep={1}
        />,
        'light',
        'vi'
      );
      const continueBtnVi = screen.getByText('Tiếp tục');
      await user.press(continueBtnVi);
      expect(screen.getByText('Vui lòng chọn hoặc nhập điểm đến của chuyến đi.')).toBeTruthy();
    });

    it('validates full name in EditProfileScreen in EN', async () => {
      const user = userEvent.setup();

      await renderWithProviders(<EditProfileScreen {...mockNavProps} />, 'light', 'en');
      const nameInput = screen.getByLabelText('Full name');
      await user.clear(nameInput);
      const saveBtn = screen.getByText('Save changes');
      await user.press(saveBtn);
      expect(screen.getByText('Full name is required')).toBeTruthy();
    });

    it('validates full name in EditProfileScreen in VI', async () => {
      const user = userEvent.setup();

      await renderWithProviders(<EditProfileScreen {...mockNavProps} />, 'light', 'vi');
      const nameInputVi = screen.getByLabelText('Họ và tên');
      await user.clear(nameInputVi);
      const saveBtnVi = screen.getByText('Lưu thay đổi');
      await user.press(saveBtnVi);
      expect(screen.getByText('Vui lòng nhập họ và tên')).toBeTruthy();
    });
  });

  describe('5. Empty States Audit Across Features', () => {
    it('renders empty state in SavedPlacesScreen', async () => {
      await renderWithProviders(<SavedPlacesScreen customPlaces={[]} />);
      expect(screen.getByText('No saved places yet')).toBeTruthy();
      expect(screen.getByText('Explore places')).toBeTruthy();
    });
  });

  describe('6. Theme & Localization Combined Matrix', () => {
    it('renders ProfileScreen in Light + EN', async () => {
      await renderWithProviders(<ProfileScreen />, 'light', 'en');
      expect(screen.getByText('Profile')).toBeTruthy();
      expect(screen.getByText('TRAVEL')).toBeTruthy();
    });

    it('renders ProfileScreen in Light + VI', async () => {
      await renderWithProviders(<ProfileScreen />, 'light', 'vi');
      expect(screen.getByText('Hồ sơ')).toBeTruthy();
      expect(screen.getByText('DU LỊCH')).toBeTruthy();
    });

    it('renders ProfileScreen in Dark + EN', async () => {
      await renderWithProviders(<ProfileScreen />, 'dark', 'en');
      expect(screen.getByText('Profile')).toBeTruthy();
      expect(screen.getByText('TRAVEL')).toBeTruthy();
    });

    it('renders ProfileScreen in Dark + VI', async () => {
      await renderWithProviders(<ProfileScreen />, 'dark', 'vi');
      expect(screen.getByText('Hồ sơ')).toBeTruthy();
      expect(screen.getByText('DU LỊCH')).toBeTruthy();
    });
  });
});
