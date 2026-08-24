import {
  createPrivateExperienceDraft,
  isFlexibleActivity,
  isProtectedPriority,
  summarizeTripExpenses,
  type TripExpense,
} from '../src/features/trips/travelWorkspace';

describe('travel workspace domain helpers', () => {
  it('summarizes planned, actual and unplanned local-currency expenses independently', () => {
    const expenses: TripExpense[] = [
      {
        id: 'e1',
        tripId: 'trip-1',
        category: 'ticket',
        origin: 'planned',
        amount: { local: { amount: 100, currency: 'THB' }, home: { amount: 72000, currency: 'VND' } },
      },
      {
        id: 'e2',
        tripId: 'trip-1',
        category: 'ticket',
        origin: 'actual',
        amount: { local: { amount: 120, currency: 'THB' }, home: { amount: 86400, currency: 'VND' } },
      },
      {
        id: 'e3',
        tripId: 'trip-1',
        category: 'food',
        origin: 'unplanned',
        amount: { local: { amount: 60, currency: 'THB' }, home: { amount: 43200, currency: 'VND' } },
      },
    ];

    expect(summarizeTripExpenses(expenses)).toEqual({
      planned: { THB: 100 },
      actual: { THB: 120 },
      unplanned: { THB: 60 },
    });
  });

  it('creates My Experience as private by default for social-ready, user-controlled publishing', () => {
    expect(
      createPrivateExperienceDraft({
        id: 'experience-1',
        tripId: 'trip-1',
        itineraryItemId: 'item-1',
        googlePlaceId: 'place-1',
        now: '2026-08-24T08:00:00.000Z',
      }),
    ).toEqual({
      id: 'experience-1',
      tripId: 'trip-1',
      itineraryItemId: 'item-1',
      googlePlaceId: 'place-1',
      visibility: 'private',
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
    });
  });

  it('identifies flexible and must-do activities for later Fix My Day logic', () => {
    expect(isFlexibleActivity({ flexibility: 'flexible' })).toBe(true);
    expect(isFlexibleActivity({ flexibility: 'fixed' })).toBe(false);
    expect(isProtectedPriority({ priority: 'must_do' })).toBe(true);
    expect(isProtectedPriority({ priority: 'optional' })).toBe(false);
  });
});
