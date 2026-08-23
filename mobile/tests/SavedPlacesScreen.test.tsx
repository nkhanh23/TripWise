import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { SavedPlacesScreen } from '../src/features/saved/screens/SavedPlacesScreen';
import type { SavedPlacesRepository } from '../src/integration/repositories';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

const mockNavigate = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(false);
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
      addListener: jest.fn().mockReturnValue(jest.fn()),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }),
}));

describe('SavedPlacesScreen (INT-P7 Saved Places Integration)', () => {
  const mockPlacesData = [
    {
      id: '11111111-1111-1111-1111-111111111111' as any,
      googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY' as any,
      name: 'Chùa Arun',
      latitude: 13.7437,
      longitude: 100.4888,
      address: 'Bangkok, Thailand',
      category: 'temple',
      createdAt: '2026-08-22T10:00:00.000Z',
    },
    {
      id: '22222222-2222-2222-2222-222222222222' as any,
      googlePlaceId: 'ChIJPzZsMU6Z4jARQUzvk913bCo' as any,
      name: 'The Grand Palace',
      latitude: 13.7500,
      longitude: 100.4913,
      address: 'Bangkok, Thailand',
      category: 'landmark',
      createdAt: '2026-08-22T11:00:00.000Z',
    },
    {
      id: '33333333-3333-3333-3333-333333333333' as any,
      googlePlaceId: 'ChIJ55555555555555555555555' as any,
      name: 'Ro Roast Cafe',
      latitude: 13.7300,
      longitude: 100.5800,
      address: 'Bangkok, Thailand',
      category: 'cafe',
      createdAt: '2026-08-22T12:00:00.000Z',
    },
  ];

  let mockRepo: jest.Mocked<SavedPlacesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      listSavedPlaces: jest.fn().mockResolvedValue({
        items: mockPlacesData,
        nextCursor: null,
      }),
      savePlace: jest.fn().mockResolvedValue(mockPlacesData[0]),
      unsavePlace: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    cleanup();
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

  it('renders header, real count badge, category chips, and real saved places', async () => {
    await renderWithProviders(<SavedPlacesScreen repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText('TripWise')).toBeTruthy();
      expect(screen.getByText('Saved')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy(); // Real count from repository

      expect(screen.getByText('Chùa Arun')).toBeTruthy();
      expect(screen.getByText('The Grand Palace')).toBeTruthy();
      expect(screen.getByText('Ro Roast Cafe')).toBeTruthy();
    });
  });

  it('filters real saved places when category chip is selected', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SavedPlacesScreen repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText('Chùa Arun')).toBeTruthy();
    });

    // Select "Cafés"
    const cafesChip = screen.getByText('Cafés');
    await user.press(cafesChip);

    expect(screen.getByText('Ro Roast Cafe')).toBeTruthy();
    expect(screen.queryByText('Chùa Arun')).toBeNull();
    expect(screen.queryByText('The Grand Palace')).toBeNull();
  });

  it('renders real empty state when repository returns zero places', async () => {
    mockRepo.listSavedPlaces.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    });

    await renderWithProviders(<SavedPlacesScreen repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText('No saved places yet')).toBeTruthy();
      expect(
        screen.getByText('Save places you like and find them here later.')
      ).toBeTruthy();
      expect(screen.getByText('Explore places')).toBeTruthy();
    });
  });

  it('renders error state when repository fails and allows retry', async () => {
    const user = userEvent.setup();
    mockRepo.listSavedPlaces.mockRejectedValueOnce(new Error('Network error'));

    await renderWithProviders(<SavedPlacesScreen repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load saved places')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    mockRepo.listSavedPlaces.mockResolvedValueOnce({
      items: mockPlacesData,
      nextCursor: null,
    });

    const retryBtn = screen.getByText('Retry');
    await user.press(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Chùa Arun')).toBeTruthy();
    });
  });

  it('handles unsave and undo with remote repository mutations', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SavedPlacesScreen repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText('Chùa Arun')).toBeTruthy();
    });

    // Unsave first item via accessibility button
    const unsaveButtons = screen.getAllByRole('button', { name: 'Remove from saved' });
    await user.press(unsaveButtons[0]);

    // Item optimistically removed
    expect(screen.queryByText('Chùa Arun')).toBeNull();
    expect(mockRepo.unsavePlace).toHaveBeenCalledWith('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');

    // Undo affordance appears
    const undoButton = screen.getByRole('button', { name: 'Undo' });
    expect(undoButton).toBeTruthy();

    await user.press(undoButton);

    // Re-saved on remote
    expect(mockRepo.savePlace).toHaveBeenCalledWith(
      expect.objectContaining({
        googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
        name: 'Chùa Arun',
      })
    );
  });
});
