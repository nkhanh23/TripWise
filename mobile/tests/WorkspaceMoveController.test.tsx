import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { TripDetailScreen } from '../src/features/trips/screens/TripDetailScreen';
import type { SavedTripDetail, TripId } from '../src/integration/contracts';
import type { SavedTripsRepository, TravelWorkspaceRepository } from '../src/integration/repositories';
import { ThemeProvider } from '../src/theme';
import { TranslationProvider } from '../src/i18n';
import { useWorkspaceMoveController } from '../src/features/trips/useWorkspaceMoveController';
import { useTripPlacePhotos } from '../src/features/trips/placePhotos';
import { mapSavedTripDetailToTripDetailData } from '../src/features/trips/integrationMappers';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, visible }: { children: React.ReactNode; visible: boolean }) => visible ? children : null,
  };
});

const tripId = '11111111-1111-4111-8111-111111111111' as TripId;
const dayOne = '22222222-2222-4222-8222-222222222222' as never;
const dayTwo = '33333333-3333-4333-8333-333333333333' as never;
const itemA = '44444444-4444-4444-8444-444444444444' as never;
const itemB = '55555555-5555-4555-8555-555555555555' as never;
function detail(revision = 1): SavedTripDetail {
  return { id: tripId, title: 'Move trip', destination: 'Hue', startDate: '2028-01-01', endDate: '2028-01-02', estimatedBudget: null, currency: null, createdAt: '2028-01-01T00:00:00.000Z', updatedAt: '2028-01-01T00:00:00.000Z', workspaceRevision: revision, days: [
    { id: dayOne, dayNumber: 1, date: '2028-01-01', items: [
      { id: itemA, position: 1, itemKind: 'custom_activity', flexibility: 'fixed', priority: 'must_do', activityStatus: 'scheduled', placeName: 'A', resolution: 'UNRESOLVED', latitude: null, longitude: null },
      { id: itemB, position: 2, itemKind: 'custom_activity', flexibility: 'fixed', priority: 'must_do', activityStatus: 'scheduled', placeName: 'B', resolution: 'UNRESOLVED', latitude: null, longitude: null },
    ] },
    { id: dayTwo, dayNumber: 2, date: '2028-01-02', items: [] },
  ] };
}
const navigation = { canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => jest.fn()) };
const repo = (getDetail: jest.Mock): SavedTripsRepository => ({ getDetail, list: jest.fn(), updateItemNote: jest.fn(), deleteTrip: jest.fn(), getStats: jest.fn() });
const renderTrip = async (getDetail: jest.Mock, mutate: jest.Mock) => render(<ThemeProvider initialPreference="light"><TranslationProvider initialLocale="en"><TripDetailScreen navigation={navigation as any} route={{ params: { tripId } } as any} repository={repo(getDetail)} workspaceRepository={{ mutate } as TravelWorkspaceRepository} /></TranslationProvider></ThemeProvider>);
afterEach(cleanup);

it('sends one cross-day move command, deduplicates pending submit, and refreshes once on success', async () => {
  const moved = detail(9);
  moved.days[1].items = [moved.days[0].items.shift()!];
  const getDetail = jest.fn().mockResolvedValueOnce(detail()).mockResolvedValue(moved);
  let resolve!: (value: { revision: number }) => void;
  const mutate = jest.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
  await renderTrip(getDetail, mutate);
  await screen.findByText('A');
  await fireEvent.press(screen.getAllByRole('button', { name: 'Move or reorder' })[0]);
  await fireEvent.press(await screen.findByRole('button', { name: 'Destination day 2' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Position 1' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save position' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Saving…' }));
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ type: 'move_item', itemId: itemA, targetDayId: dayTwo, targetPosition: 1, expectedRevision: 1 }));
  await act(async () => { resolve({ revision: 2 }); });
  await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('A')).toBeNull();
  expect(screen.getByText('B')).toBeTruthy();
});

it('shows conflict message when revision check fails', async () => {
  const getDetail = jest.fn().mockResolvedValue(detail());
  const mutate = jest.fn().mockRejectedValue({ code: 'conflict' });
  await renderTrip(getDetail, mutate);
  await screen.findByText('A');
  await fireEvent.press(screen.getAllByRole('button', { name: 'Move or reorder' })[0]);
  await fireEvent.press(await screen.findByRole('button', { name: 'Save position' }));
  expect(await screen.findByText('This trip was updated elsewhere.')).toBeTruthy();
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(getDetail).toHaveBeenCalledTimes(2);
});

it('does not apply an old mutation response after unmount', async () => {
  const getDetail = jest.fn().mockResolvedValue(detail());
  let resolve!: (value: { revision: number }) => void;
  const mutate = jest.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
  const view = await renderTrip(getDetail, mutate);
  await screen.findByText('A');
  await fireEvent.press(screen.getAllByRole('button', { name: 'Move or reorder' })[0]);
  await fireEvent.press(await screen.findByRole('button', { name: 'Save position' }));
  await view.unmount();
  await act(async () => { resolve({ revision: 2 }); });
  expect(getDetail).toHaveBeenCalledTimes(1);
});

it.each([[0, 2], [1, 1]])('same-day selection %i to position %i sends exactly one command and applies authoritative order', async (index, position) => {
  const next = detail(3);
  next.days[0].items.reverse().forEach((item, offset) => { item.position = offset + 1; });
  const getDetail = jest.fn().mockResolvedValueOnce(detail()).mockResolvedValue(next);
  const mutate = jest.fn().mockResolvedValue({ revision: 3 });
  await renderTrip(getDetail, mutate);
  await screen.findByText('A');
  await fireEvent.press(screen.getAllByRole('button', { name: 'Move or reorder' })[index]);
  await fireEvent.press(screen.getByRole('button', { name: `Position ${position}` }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save position' }));
  await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(2));
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(mutate).toHaveBeenCalledWith({ type: 'move_item', tripId, itemId: index === 0 ? itemA : itemB, expectedRevision: 1, targetDayId: dayOne, targetPosition: position });
  expect(screen.getAllByTestId(/^itinerary-item-/).map((node) => node.props.testID)).toEqual([`itinerary-item-${itemB}`, `itinerary-item-${itemA}`]);
});

it('same-position no-op sends one command without a refresh', async () => {
  const getDetail = jest.fn().mockResolvedValue(detail());
  const mutate = jest.fn().mockResolvedValue({ revision: 1, noOp: true });
  await renderTrip(getDetail, mutate);
  await screen.findByText('A');
  await fireEvent.press(screen.getAllByRole('button', { name: 'Move or reorder' })[0]);
  await fireEvent.press(screen.getByRole('button', { name: 'Save position' }));
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ targetDayId: dayOne, targetPosition: 1 }));
  expect(getDetail).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Save position' })).toBeNull();
});

it('missing revision disables Save and blocks the controller mutation', async () => {
  const legacy = detail();
  delete legacy.workspaceRevision;
  const getDetail = jest.fn().mockResolvedValue(legacy);
  const mutate = jest.fn();
  await renderTrip(getDetail, mutate);
  await screen.findByText('A');
  await fireEvent.press(screen.getAllByRole('button', { name: 'Move or reorder' })[0]);
  expect(screen.getByRole('button', { name: 'Save position' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save position' }));
  expect(mutate).not.toHaveBeenCalled();
});

it('an old response cannot refetch or replace a later trip view', async () => {
  let resolve!: (value: { revision: number }) => void;
  const mutate = jest.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
  const getDetail = jest.fn().mockResolvedValue(detail(2));
  const onAuthoritativeDetail = jest.fn();
  const savedTripsRepository = repo(getDetail);
  const workspaceRepository = { mutate } as TravelWorkspaceRepository;
  const view = await renderHook((currentDetail: SavedTripDetail) => useWorkspaceMoveController({
    detail: currentDetail, savedTripsRepository, workspaceRepository, onAuthoritativeDetail,
  }), { initialProps: detail() });
  await act(() => { view.result.current.open(itemA); });
  let pending!: Promise<void>;
  await act(() => { pending = view.result.current.submit(); });
  await view.rerender({ ...detail(), id: '66666666-6666-4666-8666-666666666666' as TripId });
  await act(async () => { resolve({ revision: 2 }); await pending; });
  expect(getDetail).not.toHaveBeenCalled();
  expect(onAuthoritativeDetail).not.toHaveBeenCalled();
});

it('reordering or moving the same verified items does not request provider images again', async () => {
  const saved = detail();
  saved.days[0].items = saved.days[0].items.map((item, index) => ({
    ...item, resolution: 'VERIFIED', googlePlaceId: `test-provider-place-${index}` as never,
    latitude: 16, longitude: 107, placeResolvedAt: '2028-01-01T00:00:00Z',
  }));
  const initial = mapSavedTripDetailToTripDetailData(saved);
  const getPlaceImage = jest.fn().mockResolvedValue({ uri: null, source: 'PLACEHOLDER' });
  const getTripCover = jest.fn().mockResolvedValue({ uri: null, source: 'PLACEHOLDER' });
  const place = { getPlaceImage };
  const cover = { getTripCover };
  const view = await renderHook((data: typeof initial) => useTripPlacePhotos(data, place, cover), { initialProps: initial });
  expect(getPlaceImage).toHaveBeenCalledTimes(2);
  expect(getTripCover).toHaveBeenCalledTimes(1);
  await view.rerender({ ...initial, days: [{ ...initial.days[0], items: [...initial.days[0].items].reverse() }, initial.days[1]] });
  await view.rerender({ ...initial, days: [{ ...initial.days[0], items: [initial.days[0].items[1]] }, { ...initial.days[1], items: [initial.days[0].items[0]] }] });
  expect(getPlaceImage).toHaveBeenCalledTimes(2);
  expect(getTripCover).toHaveBeenCalledTimes(1);
});
