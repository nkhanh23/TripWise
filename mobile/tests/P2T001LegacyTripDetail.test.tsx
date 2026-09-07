import { render, screen } from '@testing-library/react-native';
import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { TripDetailScreen } from '../src/features/trips/screens/TripDetailScreen';
import type { Database } from '../src/lib/supabase/database.types';
import { SupabaseSavedTripsRepository } from '../src/integration/remote/supabaseTripRepositories';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../src/features/trips/components/TripDetailHero', () => ({ TripDetailHero: () => null }));
jest.mock('../src/features/trips/components/TripDetailTopBar', () => ({ TripDetailTopBar: () => null }));
jest.mock('../src/features/trips/components/TripDaySelector', () => ({ TripDaySelector: () => null }));
jest.mock('../src/features/trips/components/TripSummaryBentoCard', () => ({ TripSummaryBentoCard: () => null }));
jest.mock('../src/features/trips/components/TripEmptyDayState', () => ({ TripEmptyDayState: () => null }));
jest.mock('../src/features/trips/components/TripFAB', () => ({ TripFAB: () => null }));
jest.mock('../src/features/trips/components/ItineraryCard', () => {
  const React = require('react'); const { Text } = require('react-native');
  return { ItineraryCard: ({ item }: { item: { title: string } }) => React.createElement(Text, null, item.title) };
});
jest.mock('../src/features/trips/placePhotos', () => ({
  useTripPlacePhotos: () => ({ heroImage: null, heroPhotoUrl: null, itemImages: {} }),
}));
jest.mock('../src/features/trips/placeResolution', () => ({
  usePlaceResolution: () => ({ resolve: jest.fn(), statuses: {} }),
}));

const tripId = '11111111-1111-4111-8111-111111111111';
const legacyDetail = {
  id: tripId, title: 'Legacy Trip', destination: 'Hue', startDate: '2026-09-01', endDate: '2026-09-01',
  estimatedBudget: null, currency: null, createdAt: '2026-08-20T01:00:00.000Z', updatedAt: '2026-08-20T01:00:00.000Z',
  days: [{
    id: '22222222-2222-4222-8222-222222222222', dayNumber: 1, date: '2026-09-01', items: [{
      id: '33333333-3333-4333-8333-333333333333', position: 1, placeName: 'Legacy place', resolution: 'UNRESOLVED',
    }],
  }],
};

it('P2-T001 keeps the real legacy RPC shape readable through repository, validation, mapper, and Trip Detail', async () => {
  const abortSignal = jest.fn().mockResolvedValue({ data: legacyDetail, error: null });
  const rpc = jest.fn().mockReturnValue({ abortSignal });
  const repository = new SupabaseSavedTripsRepository({ rpc } as unknown as SupabaseClient<Database>);
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => jest.fn()) } as any;

  await render(<ThemeProvider initialPreference="light"><TranslationProvider initialLocale="en">
    <TripDetailScreen route={{ params: { tripId } } as any} navigation={navigation} repository={repository} />
  </TranslationProvider></ThemeProvider>);

  expect(await screen.findByText('Legacy place')).toBeTruthy();
  expect(screen.queryByText('Unable to load trip details')).toBeNull();
  expect(rpc).toHaveBeenCalledWith('get_saved_trip_detail', { p_trip_id: tripId });
});
