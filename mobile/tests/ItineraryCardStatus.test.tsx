import { cleanup, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ItineraryCard } from '../src/features/trips/components/ItineraryCard';
import type { ItineraryItem } from '../src/features/trips/types';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

const item: ItineraryItem = {
  id: '22222222-2222-4222-8222-222222222222',
  type: 'activity',
  time: '09:00',
  title: 'Museum',
  iconName: 'location-on',
};

afterEach(cleanup);

it.each([
  ['completed', 'Completed'],
  ['skipped', 'Skipped'],
] as const)('renders the authoritative %s state on the itinerary card', async (activityStatus, label) => {
  await render(<ThemeProvider initialPreference="light"><TranslationProvider initialLocale="en"><ItineraryCard item={{ ...item, activityStatus }} /></TranslationProvider></ThemeProvider>);
  expect(screen.getByText(label)).toBeTruthy();
});

it('keeps scheduled as the unchanged default card presentation', async () => {
  await render(<ThemeProvider initialPreference="dark"><TranslationProvider initialLocale="vi"><ItineraryCard item={{ ...item, activityStatus: 'scheduled' }} /></TranslationProvider></ThemeProvider>);
  expect(screen.queryByText('Đã hoàn thành')).toBeNull();
  expect(screen.queryByText('Đã bỏ qua')).toBeNull();
});
