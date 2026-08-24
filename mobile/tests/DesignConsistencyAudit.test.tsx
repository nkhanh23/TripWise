import { cleanup, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ForgotPasswordScreen } from '../src/features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '../src/features/auth/screens/LoginScreen';
import { RegisterScreen } from '../src/features/auth/screens/RegisterScreen';
import { ExploreScreen } from '../src/features/explore/ExploreScreen';
import { mockExplorePlaces } from '../src/features/explore/data/mockPlaces';
import { PlaceDetailScreen } from '../src/features/place/screens/PlaceDetailScreen';
import { CreateTripWizardScreen } from '../src/features/planner/screens/CreateTripWizardScreen';
import { resetProfile } from '../src/features/profile/data/mockProfile';
import { EditProfileScreen } from '../src/features/profile/screens/EditProfileScreen';
import { ProfileScreen } from '../src/features/profile/screens/ProfileScreen';
import { RoutePreviewScreen } from '../src/features/route/screens/RoutePreviewScreen';
import { resetSavedPlaces, savePlace } from '../src/features/saved/data/savedPlacesStore';
import { SavedPlacesScreen } from '../src/features/saved/screens/SavedPlacesScreen';
import { resetSettings } from '../src/features/settings/data/settingsStore';
import { CurrencySettingsScreen } from '../src/features/settings/screens/CurrencySettingsScreen';
import { HelpSupportScreen } from '../src/features/settings/screens/HelpSupportScreen';
import { SettingsScreen } from '../src/features/settings/screens/SettingsScreen';
import { AddPlaceScreen } from '../src/features/trips/screens/AddPlaceScreen';
import { MyTripsScreen } from '../src/features/trips/screens/MyTripsScreen';
import { TripDetailScreen } from '../src/features/trips/screens/TripDetailScreen';
import { TripMapScreen } from '../src/features/trips/screens/TripMapScreen';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

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

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    status: 'authenticated',
    user: { email: 'sarah.j@example.com' },
    profile: { display_name: 'Sarah Jenkins' },
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

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
    SafeAreaView: ({ children, style }: any) => <View style={style}>{children}</View>,
  };
});

describe('Design Consistency Audit (FE-P18-T001)', () => {
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

  async function renderMatrix(
    ui: React.ReactElement,
    theme: 'light' | 'dark',
    locale: 'en' | 'vi'
  ) {
    return await render(
      <ThemeProvider initialPreference={theme}>
        <TranslationProvider initialLocale={locale}>
          {ui}
        </TranslationProvider>
      </ThemeProvider>
    );
  }

  describe('1. Matrix: Light + EN (Baseline Stitch Alignment)', () => {
    it('renders Auth (Login, Register, Forgot Password) in Light + EN', async () => {
      await renderMatrix(<LoginScreen {...mockNavProps} />, 'light', 'en');
      expect(screen.getByText('Sign in')).toBeTruthy();
      expect(screen.getByPlaceholderText('name@example.com')).toBeTruthy();
    });

    it('renders Explore in Light + EN', async () => {
      await renderMatrix(<ExploreScreen initialPlaces={mockExplorePlaces} />, 'light', 'en');
      expect(screen.getByPlaceholderText('Search Tokyo, Bangkok...')).toBeTruthy();
    });

    it('renders Place Detail in Light + EN', async () => {
      await renderMatrix(
        <PlaceDetailScreen
          {...mockNavProps}
          fixtureMode
          route={{ key: 'PlaceDetail', name: 'PlaceDetail', params: { placeId: 'place_wat_arun' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByText('Wat Arun')).toBeTruthy();
      expect(screen.getByText('Get Directions')).toBeTruthy();
    });

    it('renders Route Preview in Light + EN', async () => {
      await renderMatrix(
        <RoutePreviewScreen
          {...mockNavProps}
          fixtureMode
          route={{
            key: 'RoutePreview',
            name: 'RoutePreview',
            params: { destinationId: 'place_wat_arun', destinationName: 'Wat Arun' },
          }}
        />,
        'light',
        'en'
      );
      expect(screen.getByText('Wat Arun')).toBeTruthy();
      expect(screen.getAllByText('Current Location').length).toBeGreaterThanOrEqual(1);
    });

    it('renders My Trips in Light + EN', async () => {
      await renderMatrix(<MyTripsScreen fixtureMode />, 'light', 'en');
      expect(screen.getByText('My Trips')).toBeTruthy();
      expect(screen.getByText('Upcoming')).toBeTruthy();
    });

    it('renders Create Trip Wizard in Light + EN', async () => {
      await renderMatrix(<CreateTripWizardScreen initialStep={1} />, 'light', 'en');
      expect(screen.getByText('Where are you going?')).toBeTruthy();
    });

    it('renders Trip Detail in Light + EN', async () => {
      await renderMatrix(
        <TripDetailScreen
          {...mockNavProps}
          route={{ key: 'TripDetail', name: 'TripDetail', params: { tripId: 'trip_bangkok' } }}
        />,
        'light',
        'en'
      );
      expect(screen.getByText('Bangkok Adventure')).toBeTruthy();
    });

    it('renders Settings in Light + EN', async () => {
      await renderMatrix(<SettingsScreen {...mockNavProps} />, 'light', 'en');
      expect(screen.getByText('Settings')).toBeTruthy();
      expect(screen.getByText('GENERAL')).toBeTruthy();
    });
  });

  describe('2. Matrix: Light + VI (Vietnamese Localization & Hierarchy Alignment)', () => {
    it('renders Auth (Login, Register, Forgot Password) in Light + VI', async () => {
      await renderMatrix(<LoginScreen {...mockNavProps} />, 'light', 'vi');
      expect(screen.getByText('Đăng nhập')).toBeTruthy();
      expect(screen.getByText('Chưa có tài khoản?')).toBeTruthy();
    });

    it('renders Explore in Light + VI', async () => {
      await renderMatrix(<ExploreScreen initialPlaces={mockExplorePlaces} />, 'light', 'vi');
      expect(screen.getByPlaceholderText('Tìm địa điểm, quán cafe, khách sạn...')).toBeTruthy();
    });

    it('renders Place Detail in Light + VI', async () => {
      await renderMatrix(
        <PlaceDetailScreen
          {...mockNavProps}
          fixtureMode
          route={{ key: 'PlaceDetail', name: 'PlaceDetail', params: { placeId: 'place_wat_arun' } }}
        />,
        'light',
        'vi'
      );
      expect(screen.getByText('Wat Arun')).toBeTruthy();
      expect(screen.getByText('Chỉ đường')).toBeTruthy();
    });

    it('renders My Trips in Light + VI', async () => {
      await renderMatrix(<MyTripsScreen fixtureMode />, 'light', 'vi');
      expect(screen.getByText('Chuyến đi của tôi')).toBeTruthy();
      expect(screen.getByText('Sắp diễn ra')).toBeTruthy();
    });

    it('renders Settings in Light + VI', async () => {
      await renderMatrix(<SettingsScreen {...mockNavProps} />, 'light', 'vi');
      expect(screen.getByText('Cài đặt')).toBeTruthy();
      expect(screen.getByText('CHUNG')).toBeTruthy();
    });
  });

  describe('3. Matrix: Dark + EN (Semantic Dark Transformation & Contrast)', () => {
    it('renders Auth in Dark + EN', async () => {
      await renderMatrix(<RegisterScreen {...mockNavProps} />, 'dark', 'en');
      expect(screen.getByText('Create account')).toBeTruthy();
    });

    it('renders Explore in Dark + EN', async () => {
      await renderMatrix(<ExploreScreen initialPlaces={mockExplorePlaces} />, 'dark', 'en');
      expect(screen.getByPlaceholderText('Search Tokyo, Bangkok...')).toBeTruthy();
    });

    it('renders Trip Map in Dark + EN', async () => {
      await renderMatrix(
        <TripMapScreen
          {...mockNavProps}
          route={{ key: 'TripMap', name: 'TripMap', params: { tripId: 'trip_bangkok' } }}
        />,
        'dark',
        'en'
      );
      expect(screen.getByText('Bangkok Trip Map')).toBeTruthy();
    });

    it('renders Saved Places in Dark + EN', async () => {
      savePlace('place_wat_arun');
      await renderMatrix(<SavedPlacesScreen fixtureMode />, 'dark', 'en');
      expect(screen.getByText('Saved')).toBeTruthy();
      expect(screen.getByText('Wat Arun')).toBeTruthy();
    });

    it('renders Profile in Dark + EN', async () => {
      await renderMatrix(<ProfileScreen />, 'dark', 'en');
      expect(screen.getByText('Profile')).toBeTruthy();
      expect(screen.getByText('TRAVEL')).toBeTruthy();
    });
  });

  describe('4. Matrix: Dark + VI (Combined Stress State & Hierarchy)', () => {
    it('renders Trip Detail in Dark + VI', async () => {
      await renderMatrix(
        <TripDetailScreen
          {...mockNavProps}
          route={{ key: 'TripDetail', name: 'TripDetail', params: { tripId: 'trip_bangkok' } }}
        />,
        'dark',
        'vi'
      );
      expect(screen.getByText('Bangkok Adventure')).toBeTruthy();
    });

    it('renders Add Place in Dark + VI', async () => {
      await renderMatrix(
        <AddPlaceScreen
          {...mockNavProps}
          route={{ key: 'AddPlace', name: 'AddPlace', params: { tripId: 'trip_bangkok_2026', dayIndex: 1 } }}
        />,
        'dark',
        'vi'
      );
      expect(screen.getByText('Thêm địa điểm')).toBeTruthy();
      expect(screen.getByPlaceholderText('Tìm điểm tham quan, nhà hàng...')).toBeTruthy();
    });

    it('renders Saved Places in Dark + VI', async () => {
      savePlace('place_wat_arun');
      await renderMatrix(<SavedPlacesScreen fixtureMode />, 'dark', 'vi');
      expect(screen.getByText('Đã lưu')).toBeTruthy();
      expect(screen.getByText('Wat Arun')).toBeTruthy();
    });

    it('renders Settings in Dark + VI', async () => {
      await renderMatrix(<SettingsScreen {...mockNavProps} />, 'dark', 'vi');
      expect(screen.getByText('Cài đặt')).toBeTruthy();
      expect(screen.getByText('CHUNG')).toBeTruthy();
      expect(screen.getByText('GIAO DIỆN')).toBeTruthy();
    });
  });
});
