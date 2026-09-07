import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ActivityEditorScreen } from '../src/features/trips/screens/ActivityEditorScreen';
import { useActivityEditorController } from '../src/features/trips/useActivityEditorController';
import type { SavedTripDetail, TripId, WorkspaceItemKind } from '../src/integration/contracts';
import type { SavedTripsRepository, TravelWorkspaceRepository } from '../src/integration/repositories';
import { parseSavedTripDetail } from '../src/integration/validation';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));
let mockCurrentUser: { id: string } | null = { id: '11111111-1111-4111-8111-111111111111' };
jest.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: mockCurrentUser }) }));

const tripId = '11111111-1111-4111-8111-111111111111' as TripId;
const itemId = '22222222-2222-4222-8222-222222222222' as never;
const dayId = '33333333-3333-4333-8333-333333333333' as never;

function detail(itemKind: WorkspaceItemKind = 'custom_activity', item: Record<string, unknown> = {}, revision = 1): SavedTripDetail {
  return {
    id: tripId, title: 'Trip', destination: 'Hue', startDate: '2028-01-01', endDate: '2028-01-01', estimatedBudget: null,
    currency: null, createdAt: '2028-01-01T00:00:00.000Z', updatedAt: '2028-01-01T00:00:00.000Z', workspaceRevision: revision,
    days: [{ id: dayId, dayNumber: 1, date: '2028-01-01', items: [{
      id: itemId, position: 1, itemKind, flexibility: 'fixed', priority: 'must_do', activityStatus: 'scheduled', placeName: 'Owner item',
      resolution: 'UNRESOLVED', latitude: null, longitude: null, sourceLinks: [],
      ...(itemKind === 'transport' ? { transport: { mode: 'train' } } : {}),
      ...(itemKind === 'accommodation' ? { accommodation: {} } : {}),
      ...item,
    }] }],
  } as SavedTripDetail;
}

function repository(getDetail: jest.Mock): SavedTripsRepository {
  return { getDetail, list: jest.fn(), updateItemNote: jest.fn(), deleteTrip: jest.fn(), getStats: jest.fn() };
}

async function renderEditor({
  current = detail(), mutate = jest.fn().mockResolvedValue({ revision: 2 }), getDetail = jest.fn().mockResolvedValue(current),
  locale = 'en', navigation = { goBack: jest.fn() },
} = {}) {
  const view = await render(
    <ThemeProvider initialPreference="dark"><TranslationProvider initialLocale={locale as 'en' | 'vi'}>
      <ActivityEditorScreen route={{ params: { tripId, mode: 'edit', itemId } } as any} navigation={navigation as any}
        savedTripsRepository={repository(getDetail)} workspaceRepository={{ mutate } as TravelWorkspaceRepository}/>
    </TranslationProvider></ThemeProvider>,
  );
  await screen.findByLabelText(locale === 'vi' ? 'Tên liên hệ' : 'Contact name');
  return { view, mutate, getDetail, navigation };
}

async function change(label: string, value: string) {
  await act(async () => { fireEvent.changeText(screen.getByLabelText(label), value); });
}

async function press(name: string) {
  await act(async () => { fireEvent.press(screen.getByRole('button', { name })); });
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockCurrentUser = { id: '11111111-1111-4111-8111-111111111111' };
});

it('saves valid transport and contact metadata once with stable item identity', async () => {
  const { mutate } = await renderEditor({ current: detail('transport') });
  await press('Train');
  await change('Origin', 'Hue Station');
  await change('Destination', 'Da Nang Station');
  await change('Departure (ISO timestamp)', '2028-01-01T10:00:00Z');
  await change('Arrival (ISO timestamp)', '2028-01-01T12:00:00Z');
  await change('Planned cost', '125000');
  await change('Currency', 'VND');
  await change('Phone', '+84 123 456');
  await press('Save activity');
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
    type: 'update_item', itemId, expectedRevision: 1,
    patch: expect.objectContaining({ contact: expect.objectContaining({ phone: '+84 123 456' }),
      transport: expect.objectContaining({ mode: 'train', plannedCostAmount: 125000, plannedCostCurrency: 'VND' }) }),
  }));
  expect(mutate.mock.calls[0][0].patch).not.toHaveProperty('googlePlaceId');
});

it.each([
  ['missing arrival', '2028-01-01T10:00:00Z', '', '', ''],
  ['reverse range', '2028-01-01T12:00:00Z', '2028-01-01T10:00:00Z', '', ''],
  ['cost without currency', '', '', '10', ''],
  ['invalid currency', '', '', '10', 'vnd'],
] as const)('rejects invalid transport %s without mutation', async (_case, departure, arrival, cost, currency) => {
  const mutate = jest.fn();
  await renderEditor({ current: detail('transport'), mutate });
  await change('Departure (ISO timestamp)', departure);
  await change('Arrival (ISO timestamp)', arrival);
  await change('Planned cost', cost);
  await change('Currency', currency);
  await press('Save activity');
  expect(await screen.findByText(/Check paired timestamps/)).toBeTruthy();
  expect(mutate).not.toHaveBeenCalled();
});

it('saves valid accommodation metadata', async () => {
  const mutate = jest.fn().mockResolvedValue({ revision: 2 });
  await renderEditor({ current: detail('accommodation'), mutate });
  await change('Check-in (ISO timestamp)', '2028-01-01T15:00:00Z');
  await change('Check-out (ISO timestamp)', '2028-01-03T11:00:00Z');
  await change('Nights', '2');
  await press('Save activity');
  await waitFor(() => expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ itemId,
    patch: expect.objectContaining({ accommodation: { checkInAt: '2028-01-01T15:00:00Z', checkOutAt: '2028-01-03T11:00:00Z', nights: 2 } }) })));
});

it('rejects invalid accommodation range and inconsistent nights', async () => {
  const mutate = jest.fn();
  await renderEditor({ current: detail('accommodation'), mutate });
  await change('Check-in (ISO timestamp)', '2028-01-03T15:00:00Z');
  await change('Check-out (ISO timestamp)', '2028-01-01T11:00:00Z');
  await change('Nights', '2');
  await press('Save activity');
  expect(await screen.findByText(/Check the stay timestamps/)).toBeTruthy();
  expect(mutate).not.toHaveBeenCalled();
});

it('saves valid contact fields', async () => {
  const mutate = jest.fn().mockResolvedValue({ revision: 2 });
  await renderEditor({ mutate });
  await change('Contact name', 'Hotel desk');
  await change('Website URL', 'https://example.test');
  await press('Save activity');
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
});

it('rejects unsafe contact URL and phone', async () => {
  const mutate = jest.fn();
  await renderEditor({ mutate });
  await change('Phone', 'call-me');
  await change('Website URL', 'http://unsafe.test');
  await press('Save activity');
  expect(await screen.findByText(/Check contact lengths/)).toBeTruthy();
  expect(mutate).not.toHaveBeenCalled();
});

it.each(['create', 'update', 'remove'] as const)('%s source links with one replace command', async (operation) => {
  const initial = operation === 'create' ? [] : [{ type: 'website' as const, url: 'https://old.test' }];
  const { mutate } = await renderEditor({ current: detail('custom_activity', { sourceLinks: initial }) });
  if (operation === 'create') await press('Add source link');
  if (operation === 'remove') await press('Remove source link 1');
  else await change('HTTPS URL', 'https://new.test');
  await press('Save source links');
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  expect(mutate).toHaveBeenCalledWith({ type: 'replace_source_links', tripId, itemId, expectedRevision: 1,
    links: operation === 'remove' ? [] : [{ type: 'website', url: 'https://new.test' }] });
});

it('rejects Other without label and preserves one-attempt TW009 behavior', async () => {
  const getDetail = jest.fn().mockResolvedValueOnce(detail()).mockResolvedValueOnce(detail('custom_activity', {}, 2));
  const mutate = jest.fn().mockRejectedValue({ code: 'conflict' });
  await renderEditor({ mutate, getDetail });
  await press('Add source link');
  await press('Other');
  await change('HTTPS URL', 'https://other.test');
  await press('Save source links');
  expect(await screen.findByText(/add a label for Other/)).toBeTruthy();
  expect(mutate).not.toHaveBeenCalled();
  await change('Label', 'Receipt');
  await press('Save source links');
  await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(2));
  expect(mutate).toHaveBeenCalledTimes(1);
});

it('blocks duplicate source-link submit', async () => {
  let resolve!: (value: { revision: number }) => void;
  const mutate = jest.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
  const routeParams = { tripId, mode: 'edit' as const, itemId };
  const getDetail = jest.fn().mockResolvedValue(detail());
  const savedTripsRepo = repository(getDetail);
  const onSuccess = jest.fn();
  const view = await renderHook(() => useActivityEditorController({
    route: routeParams,
    user: mockCurrentUser,
    savedTripsRepository: savedTripsRepo,
    workspaceRepository: { mutate } as TravelWorkspaceRepository,
    onSuccess,
  }));
  await waitFor(() => expect(view.result.current.mutationReady).toBe(true));
  await act(async () => {
    void view.result.current.saveSourceLinks();
    void view.result.current.saveSourceLinks();
  });
  expect(mutate).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ revision: 2 }); });
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
});

it('shows only the relevant kind form and renders Vietnamese accessible controls', async () => {
  await renderEditor({ current: detail('transport'), locale: 'vi' });
  expect(await screen.findByText('Chi tiết di chuyển')).toBeTruthy();
  expect(screen.queryByText('Chi tiết lưu trú')).toBeNull();
  expect(screen.getByRole('button', { name: 'Lưu liên kết nguồn' }).props.accessibilityState.disabled).toBe(false);
});

it('parses complete metadata and ordered source links from the authoritative read transport', () => {
  const raw = JSON.parse(JSON.stringify(detail('transport', { contact: { name: 'Desk' },
    transport: { mode: 'train', departureAt: '2028-01-01T10:00:00Z', arrivalAt: '2028-01-01T12:00:00Z' },
    sourceLinks: [{ type: 'website', url: 'https://one.test' }, { type: 'other', url: 'https://two.test', label: 'Two' }] })));
  delete raw.days[0].items[0].latitude;
  delete raw.days[0].items[0].longitude;
  expect(parseSavedTripDetail(raw)?.days[0].items[0]).toEqual(expect.objectContaining({ contact: { name: 'Desk' },
    transport: expect.objectContaining({ mode: 'train' }), sourceLinks: [{ type: 'website', url: 'https://one.test' },
      { type: 'other', url: 'https://two.test', label: 'Two' }] }));
});
