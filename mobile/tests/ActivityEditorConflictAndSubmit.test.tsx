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
const dayId = '33333333-3333-4333-8333-333333333333' as never;
const itemId = '22222222-2222-4222-8222-222222222222' as never;
const makeDetail = (revision = 1, title = 'Original'): SavedTripDetail => ({ id: tripId, title: 'Trip', destination: 'Hue', startDate: '2028-01-01', endDate: '2028-01-01', estimatedBudget: null, currency: null, createdAt: '2028-01-01T00:00:00.000Z', updatedAt: '2028-01-01T00:00:00.000Z', workspaceRevision: revision, days: [{ id: dayId, dayNumber: 1, date: '2028-01-01', items: [{ id: itemId, position: 1, itemKind: 'custom_activity', flexibility: 'fixed', priority: 'must_do', activityStatus: 'scheduled', placeName: title, resolution: 'UNRESOLVED', latitude: null, longitude: null, startTime: '09:00', endTime: '10:00' }] }] });
const repo = (getDetail: jest.Mock): SavedTripsRepository => ({ getDetail, list: jest.fn(), updateItemNote: jest.fn(), deleteTrip: jest.fn(), getStats: jest.fn() });
const renderEditor = async (savedTripsRepository: SavedTripsRepository, workspaceRepository: TravelWorkspaceRepository, navigation = { goBack: jest.fn() }) => ({ ...await render(<ThemeProvider initialPreference="light"><TranslationProvider initialLocale="en"><ActivityEditorScreen route={{ params: { tripId, mode: 'edit', itemId } } as any} navigation={navigation as any} savedTripsRepository={savedTripsRepository} workspaceRepository={workspaceRepository} /></TranslationProvider></ThemeProvider>), navigation });
afterEach(() => { cleanup(); mockCurrentUser = { id: '11111111-1111-4111-8111-111111111111' }; });

it('keeps draft, refreshes once, does not retry, and saves manually with the refreshed revision after TW009', async () => {
  const getDetail = jest.fn().mockResolvedValueOnce(makeDetail()).mockResolvedValueOnce(makeDetail(7, 'Server title'));
  const mutate = jest.fn().mockRejectedValueOnce({ code: 'conflict' }).mockResolvedValueOnce({ revision: 8 });
  const { navigation } = await renderEditor(repo(getDetail), { mutate } as TravelWorkspaceRepository);
  await act(async () => { fireEvent.changeText(await screen.findByLabelText('Activity title'), 'My kept draft'); });
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Save activity' })); });
  await screen.findByText('This trip was updated elsewhere.');
  expect(screen.getByLabelText('Activity title').props.value).toBe('My kept draft');
  expect(getDetail).toHaveBeenCalledTimes(2); expect(mutate).toHaveBeenCalledTimes(1);
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Save activity' })); });
  await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
  expect(mutate.mock.calls[1][0]).toEqual(expect.objectContaining({ expectedRevision: 7, patch: expect.objectContaining({ placeName: 'My kept draft' }) }));
});

it('deduplicates Save while the first mutation is pending', async () => {
  let resolve!: (value: { revision: number }) => void;
  const mutate = jest.fn().mockImplementation(() => new Promise((r) => { resolve = r; }));
  const { navigation } = await renderEditor(repo(jest.fn().mockResolvedValue(makeDetail())), { mutate } as TravelWorkspaceRepository);
  await act(async () => { fireEvent.changeText(await screen.findByLabelText('Activity title'), 'One save'); });
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Save activity' })); fireEvent.press(screen.getByRole('button', { name: 'Save activity' })); });
  expect(mutate).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ revision: 2 }); });
  await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
});

it('surfaces a status TW009, refreshes once, and never replays the transition', async () => {
  const getDetail = jest.fn().mockResolvedValueOnce(makeDetail()).mockResolvedValueOnce(makeDetail(9, 'Server title'));
  const mutate = jest.fn().mockRejectedValue({ code: 'conflict' });
  const { navigation } = await renderEditor(repo(getDetail), { mutate } as TravelWorkspaceRepository);
  await act(async () => { fireEvent.changeText(await screen.findByLabelText('Note'), 'Keep this draft'); });
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Skip item' })); });
  await screen.findByText('This trip was updated elsewhere.');
  expect(screen.getByLabelText('Note')).toHaveProp('value', 'Keep this draft');
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(mutate).toHaveBeenCalledWith({ type: 'transition_item_status', tripId, itemId, expectedRevision: 1, status: 'skipped' });
  expect(getDetail).toHaveBeenCalledTimes(2);
  expect(navigation.goBack).not.toHaveBeenCalled();
});
