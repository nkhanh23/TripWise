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

function detail(overrides: Partial<SavedTripDetail> = {}): SavedTripDetail {
  return {
    id: tripId, title: 'Trip', destination: 'Hue', startDate: '2028-01-01', endDate: '2028-01-01', estimatedBudget: null, currency: null,
    createdAt: '2028-01-01T00:00:00.000Z', updatedAt: '2028-01-01T00:00:00.000Z', workspaceRevision: 1,
    days: [{ id: dayId, dayNumber: 1, date: '2028-01-01', items: [{ id: itemId, position: 1, itemKind: 'custom_activity', flexibility: 'fixed', priority: 'must_do', activityStatus: 'scheduled', placeName: 'Original', resolution: 'UNRESOLVED', latitude: null, longitude: null, startTime: '09:00', endTime: '10:00' }] }],
    ...overrides,
  };
}

function detailWithItem(itemOverrides: Partial<SavedTripDetail['days'][number]['items'][number]>): SavedTripDetail {
  const base = detail();
  return { ...base, days: [{ ...base.days[0], items: [{ ...base.days[0].items[0], ...itemOverrides }] }] } as SavedTripDetail;
}

function savedRepo(getDetail = jest.fn().mockResolvedValue(detail())): SavedTripsRepository {
  return { getDetail, list: jest.fn(), updateItemNote: jest.fn(), deleteTrip: jest.fn(), getStats: jest.fn() };
}

async function renderEditor({
  route = { params: { tripId, mode: 'edit' as const, itemId } },
  repository = savedRepo(),
  workspaceRepository = { mutate: jest.fn().mockResolvedValue({ revision: 2 }) } as TravelWorkspaceRepository,
  navigation = { goBack: jest.fn() },
}: any = {}) {
  const view = await render(<ThemeProvider initialPreference="light"><TranslationProvider initialLocale="en"><ActivityEditorScreen route={route} navigation={navigation} savedTripsRepository={repository} workspaceRepository={workspaceRepository} /></TranslationProvider></ThemeProvider>);
  return { view, repository, workspaceRepository, navigation };
}

describe('FEATURE-P2-T001 ActivityEditor controller', () => {
  beforeEach(() => { mockCurrentUser = { id: '11111111-1111-4111-8111-111111111111' }; jest.clearAllMocks(); });
  afterEach(() => { cleanup(); mockCurrentUser = { id: '11111111-1111-4111-8111-111111111111' }; });

  it('adds only a custom activity for the selected day and navigates back after success', async () => {
    const base = detail();
    const repository = savedRepo(jest.fn().mockResolvedValue({ ...base, days: [base.days[0], { ...base.days[0], id: '44444444-4444-4444-8444-444444444444' as never, dayNumber: 2 }] }));
    const mutate = jest.fn().mockResolvedValue({ revision: 2 });
    const navigation = { goBack: jest.fn() };
    await renderEditor({ route: { params: { tripId, mode: 'add', dayId: '44444444-4444-4444-8444-444444444444' } }, repository, workspaceRepository: { mutate } as TravelWorkspaceRepository, navigation });
    const title = await screen.findByLabelText('Activity title');
    await act(async () => { fireEvent.changeText(title, 'Custom museum'); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Day 2' })); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Save activity' })); });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ type: 'create_item', dayId: '44444444-4444-4444-8444-444444444444', item: expect.objectContaining({ itemKind: 'custom_activity', title: 'Custom museum' }) }));
    expect(mutate.mock.calls[0][0].item).not.toHaveProperty('googlePlaceId');
    expect(mutate.mock.calls[0][0].item).not.toHaveProperty('latitude');
  });

  it('keeps verified provider fields locked and excludes them from the edit payload', async () => {
    const repository = savedRepo(jest.fn().mockResolvedValue(detailWithItem({ placeName: 'Canonical place', resolution: 'VERIFIED', googlePlaceId: 'google-1' as never, latitude: 16.46, longitude: 107.59 })));
    const mutate = jest.fn().mockResolvedValue({ revision: 2 });
    await renderEditor({ repository, workspaceRepository: { mutate } as TravelWorkspaceRepository });
    expect(await screen.findByText(/Verified place name/)).toBeTruthy();
    expect(screen.queryByLabelText('Activity title')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Save activity' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0].patch).not.toHaveProperty('placeName');
    expect(mutate.mock.calls[0][0].patch).not.toHaveProperty('googlePlaceId');
    expect(mutate.mock.calls[0][0].patch).not.toHaveProperty('latitude');
  });

  it.each([
    ['creates', undefined, 'Meet by the east gate', 'Meet by the east gate'],
    ['updates', 'Old note', 'Bring a raincoat', 'Bring a raincoat'],
    ['removes', 'Old note', '   ', null],
  ])('%s an item note through the CAS workspace mutation', async (_verb, initialNote, nextNote, expectedNote) => {
    const getDetail = jest.fn().mockResolvedValue(detailWithItem({ note: initialNote }));
    const mutate = jest.fn().mockResolvedValue({ revision: 2 });
    await renderEditor({ repository: savedRepo(getDetail), workspaceRepository: { mutate } as TravelWorkspaceRepository });
    await act(async () => { fireEvent.changeText(await screen.findByLabelText('Note'), nextNote); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Save activity' })); });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'update_item', tripId, itemId, expectedRevision: 1,
      patch: expect.objectContaining({ note: expectedNote }),
    }));
    expect(mutate.mock.calls[0][0].patch).not.toHaveProperty('googlePlaceId');
    expect(mutate.mock.calls[0][0].patch).not.toHaveProperty('latitude');
    expect(getDetail).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Mark completed', 'completed'],
    ['Skip item', 'skipped'],
  ] as const)('transitions the same item with %s and performs no mutation replay or extra read', async (action, status) => {
    const getDetail = jest.fn().mockResolvedValue(detail());
    const mutate = jest.fn().mockResolvedValue({ revision: 2 });
    const navigation = { goBack: jest.fn() };
    await renderEditor({ repository: savedRepo(getDetail), workspaceRepository: { mutate } as TravelWorkspaceRepository, navigation });
    await act(async () => { fireEvent.press(await screen.findByRole('button', { name: action })); });
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ type: 'transition_item_status', tripId, itemId, expectedRevision: 1, status });
    expect(getDetail).toHaveBeenCalledTimes(1);
  });

  it.each(['completed', 'skipped'] as const)('only offers the valid return-to-scheduled transition from %s', async (activityStatus) => {
    await renderEditor({ repository: savedRepo(jest.fn().mockResolvedValue(detailWithItem({ activityStatus }))) });
    expect(await screen.findByRole('button', { name: 'Return to scheduled' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mark completed' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Skip item' })).toBeNull();
  });

  it.each([
    ['bad time', { start: '9:00', end: '10:00' }, 'Use a valid time in HH:MM format.'],
    ['reverse range', { start: '11:00', end: '10:00' }, 'End time must be after start time.'],
  ])('rejects %s without a mutation', async (_name, times, message) => {
    const mutate = jest.fn();
    await renderEditor({ workspaceRepository: { mutate } as TravelWorkspaceRepository });
    await act(async () => { fireEvent.changeText(await screen.findByLabelText('Start time'), times.start); });
    await act(async () => { fireEvent.changeText(screen.getByLabelText('End time'), times.end); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Save activity' })); });
    expect(await screen.findByText(message)).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('clears an eligible time as null', async () => {
    const mutate = jest.fn().mockResolvedValue({ revision: 2 });
    await renderEditor({ workspaceRepository: { mutate } as TravelWorkspaceRepository });
    await screen.findByLabelText('Start time');
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Remove time' })); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Save activity' })); });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0].patch).toEqual(expect.objectContaining({ startTime: null, endTime: null }));
  });

  it.each(['note', 'transport'] as const)('omits generic time controls for %s', async (itemKind) => {
    cleanup();
    await renderEditor({ repository: savedRepo(jest.fn().mockResolvedValue(detailWithItem({ itemKind }))), workspaceRepository: { mutate: jest.fn() } as TravelWorkspaceRepository });
    expect(await screen.findByText('Time is not available for this item type.')).toBeTruthy();
    expect(screen.queryByLabelText('Start time')).toBeNull();
  });

  it('renders a legacy detail but blocks mutations without an authoritative revision', async () => {
    const mutate = jest.fn();
    await renderEditor({ repository: savedRepo(jest.fn().mockResolvedValue(detail({ workspaceRevision: undefined }))), workspaceRepository: { mutate } as TravelWorkspaceRepository });
    expect(await screen.findByText('Editing is temporarily unavailable. Refresh and try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save activity' }).props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Save activity' }));
    expect(mutate).not.toHaveBeenCalled();
  });

});
