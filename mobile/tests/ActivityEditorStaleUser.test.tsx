import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { SavedTripDetail, TripId } from '../src/integration/contracts';
import type { SavedTripsRepository, TravelWorkspaceRepository } from '../src/integration/repositories';
import { ActivityEditorScreen } from '../src/features/trips/screens/ActivityEditorScreen';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));

let mockCurrentUser: { id: string } | null = { id: '11111111-1111-4111-8111-111111111111' };
jest.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: mockCurrentUser }) }));

const tripId = '11111111-1111-4111-8111-111111111111' as TripId;
const itemId = '22222222-2222-4222-8222-222222222222' as never;
const dayId = '33333333-3333-4333-8333-333333333333' as never;

function trip(title: string): SavedTripDetail {
  return {
    id: tripId, title: 'Trip', destination: 'Hue', startDate: '2028-01-01', endDate: '2028-01-01', estimatedBudget: null, currency: null,
    createdAt: '2028-01-01T00:00:00.000Z', updatedAt: '2028-01-01T00:00:00.000Z', workspaceRevision: 1,
    days: [{ id: dayId, dayNumber: 1, date: '2028-01-01', items: [{ id: itemId, position: 1, itemKind: 'custom_activity', flexibility: 'fixed', priority: 'must_do', activityStatus: 'scheduled', placeName: title, resolution: 'UNRESOLVED', latitude: null, longitude: null, startTime: '09:00', endTime: '10:00' }] }],
  };
}

afterEach(() => { cleanup(); mockCurrentUser = { id: '11111111-1111-4111-8111-111111111111' }; });

it('ignores an old user response after auth changes and does not update the new user UI', async () => {
  let resolveOld!: (value: SavedTripDetail) => void;
  let resolveNew!: (value: SavedTripDetail) => void;
  const getDetail = jest.fn()
    .mockImplementationOnce(() => new Promise<SavedTripDetail>((resolve) => { resolveOld = resolve; }))
    .mockImplementationOnce(() => new Promise<SavedTripDetail>((resolve) => { resolveNew = resolve; }));
  const repository: SavedTripsRepository = { getDetail, list: jest.fn(), updateItemNote: jest.fn(), deleteTrip: jest.fn(), getStats: jest.fn() };
  const workspaceRepository = { mutate: jest.fn() } as TravelWorkspaceRepository;
  const view = await render(<ThemeProvider initialPreference="light"><TranslationProvider initialLocale="en"><ActivityEditorScreen route={{ params: { tripId, mode: 'edit', itemId } } as any} navigation={{ goBack: jest.fn() } as any} savedTripsRepository={repository} workspaceRepository={workspaceRepository} /></TranslationProvider></ThemeProvider>);
  await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(1));
  mockCurrentUser = { id: '44444444-4444-4444-8444-444444444444' };
  view.rerender(<ThemeProvider initialPreference="light"><TranslationProvider initialLocale="en"><ActivityEditorScreen route={{ params: { tripId, mode: 'edit', itemId } } as any} navigation={{ goBack: jest.fn() } as any} savedTripsRepository={repository} workspaceRepository={workspaceRepository} /></TranslationProvider></ThemeProvider>);
  await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(2));
  await act(async () => { resolveOld(trip('Old user title')); });
  await act(async () => { resolveNew(trip('New user title')); });
  expect(await screen.findByLabelText('Activity title')).toHaveProp('value', 'New user title');
  expect(screen.queryByDisplayValue('Old user title')).toBeNull();
});

it('ignores a completed status mutation after the authenticated user changes', async () => {
  let resolveMutation!: (value: { revision: number }) => void;
  const getDetail = jest.fn().mockResolvedValueOnce(trip('Owner A item')).mockResolvedValueOnce(trip('Owner B item'));
  const repository: SavedTripsRepository = { getDetail, list: jest.fn(), updateItemNote: jest.fn(), deleteTrip: jest.fn(), getStats: jest.fn() };
  const mutate = jest.fn().mockImplementation(() => new Promise<{ revision: number }>((resolve) => { resolveMutation = resolve; }));
  const navigation = { goBack: jest.fn() };
  const renderTree = () => <ThemeProvider initialPreference="light"><TranslationProvider initialLocale="en"><ActivityEditorScreen route={{ params: { tripId, mode: 'edit', itemId } } as any} navigation={navigation as any} savedTripsRepository={repository} workspaceRepository={{ mutate } as TravelWorkspaceRepository} /></TranslationProvider></ThemeProvider>;
  const view = await render(renderTree());
  await act(async () => { fireEvent.press(await screen.findByRole('button', { name: 'Mark completed' })); });
  expect(mutate).toHaveBeenCalledTimes(1);
  mockCurrentUser = { id: '44444444-4444-4444-8444-444444444444' };
  view.rerender(renderTree());
  await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(2));
  await act(async () => { resolveMutation({ revision: 2 }); });
  expect(await screen.findByLabelText('Activity title')).toHaveProp('value', 'Owner B item');
  expect(navigation.goBack).not.toHaveBeenCalled();
});
