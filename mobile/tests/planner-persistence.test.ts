import { renderHook, act } from '@testing-library/react-native';
import { useTripPersistence } from '../src/features/planner/persistence';
import type { TripPersistenceRepository } from '../src/integration/repositories';
import type { PlannerGeneratedPreview } from '../src/features/planner/generationContracts';
import { IntegrationError } from '../src/integration/errors';
import { CANONICAL_BUDGET_CURRENCIES } from '../src/features/planner/budgetValidation';

const samplePreview: PlannerGeneratedPreview = {
  title: 'Osaka Explorer',
  destination: 'Osaka',
  startDate: '2026-11-01',
  endDate: '2026-11-03',
  days: [
    {
      dayNumber: 1,
      date: '2026-11-01',
      items: [{ position: 1, placeName: 'Dotonbori', resolution: 'UNRESOLVED' }],
    },
    {
      dayNumber: 2,
      date: '2026-11-02',
      items: [{ position: 1, placeName: 'Osaka Castle', resolution: 'UNRESOLVED' }],
    },
    {
      dayNumber: 3,
      date: '2026-11-03',
      items: [{ position: 1, placeName: 'Shinsekai', resolution: 'UNRESOLVED' }],
    },
  ],
};

describe('useTripPersistence with configured budget and retry idempotency', () => {
  it.each(['XYZ', 'usd', 'Usd', '', ' ', ' USD', 'USD ', 'AUD', 'US', null, undefined, 123, {}, ['USD']])(
    'blocks configured amount with currency %p before repository.persist, including retry', async (currency) => {
      const persist = jest.fn();
      const { result } = await renderHook(() => useTripPersistence({ persist }));
      await act(async () => {
        await result.current.save(samplePreview, 'Invalid currency', {
          estimatedBudget: 1000,
          currency: currency as string,
        });
      });
      expect(result.current.state).toMatchObject({ status: 'error', error: { code: 'invalidRequest' } });
      await act(async () => { await result.current.retry(); });
      expect(persist).not.toHaveBeenCalled();
    },
  );

  it.each(CANONICAL_BUDGET_CURRENCIES)('preserves the exact canonical %s currency, including zero', async (currency) => {
    const persist = jest.fn().mockResolvedValue('trip');
    const { result } = await renderHook(() => useTripPersistence({ persist }));
    await act(async () => { await result.current.save(samplePreview, null, { estimatedBudget: 0, currency }); });
    expect(persist.mock.calls[0][0].graph).toMatchObject({ estimatedBudget: 0, currency });
  });

  it.each([NaN, Infinity, -1, 1000000001, 1.001, '1000'])('blocks malformed programmatic amount %p', async (amount) => {
    const persist = jest.fn();
    const { result } = await renderHook(() => useTripPersistence({ persist }));
    await act(async () => { await result.current.save(samplePreview, null, { estimatedBudget: amount as number, currency: 'USD' }); });
    expect(persist).not.toHaveBeenCalled();
  });
  it('passes exact configured budget and currency to repository.persist', async () => {
    const persistMock = jest.fn().mockResolvedValue('trip-uuid-123');
    const mockRepo: TripPersistenceRepository = {
      persist: persistMock,
    };

    const { result } = await renderHook(() => useTripPersistence(mockRepo));

    let tripId: string | null = null;
    await act(async () => {
      tripId = await result.current.save(samplePreview, 'Custom Osaka Trip', {
        estimatedBudget: 1500.5,
        currency: 'USD',
      });
    });

    expect(tripId).toBe('trip-uuid-123');
    expect(result.current.state.status).toBe('success');
    expect(persistMock).toHaveBeenCalledTimes(1);

    const callArg = persistMock.mock.calls[0][0];
    expect(callArg.graph.title).toBe('Custom Osaka Trip');
    expect(callArg.graph.estimatedBudget).toBe(1500.5);
    expect(callArg.graph.currency).toBe('USD');
    expect(callArg.idempotencyKey).toBeDefined();
  });

  it('preserves exact budget, currency, and idempotencyKey across retries', async () => {
    let callCount = 0;
    const capturedKeys: string[] = [];
    const persistMock = jest.fn().mockImplementation((command) => {
      callCount += 1;
      capturedKeys.push(command.idempotencyKey);
      if (callCount === 1) {
        throw new IntegrationError('network');
      }
      return Promise.resolve('trip-uuid-retry-success');
    });

    const mockRepo: TripPersistenceRepository = {
      persist: persistMock,
    };

    const { result } = await renderHook(() => useTripPersistence(mockRepo));

    // First attempt fails
    await act(async () => {
      await result.current.save(samplePreview, 'Retry Trip', {
        estimatedBudget: 50000,
        currency: 'JPY',
      });
    });

    expect(result.current.state.status).toBe('error');
    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(persistMock.mock.calls[0][0].graph.estimatedBudget).toBe(50000);
    expect(persistMock.mock.calls[0][0].graph.currency).toBe('JPY');

    // Retry should reuse exact same idempotencyKey and budget data
    let retryTripId: string | null = null;
    await act(async () => {
      retryTripId = await result.current.retry();
    });

    expect(retryTripId).toBe('trip-uuid-retry-success');
    expect(result.current.state.status).toBe('success');
    expect(persistMock).toHaveBeenCalledTimes(2);

    // Verify same idempotency key and same budget parameters
    expect(capturedKeys[0]).toBe(capturedKeys[1]);
    expect(persistMock.mock.calls[1][0]).toEqual(persistMock.mock.calls[0][0]);
    expect(persistMock.mock.calls[1][0].graph.estimatedBudget).toBe(50000);
    expect(persistMock.mock.calls[1][0].graph.currency).toBe('JPY');
  });

  it('correctly persists unconfigured budget as null when budget is not provided', async () => {
    const persistMock = jest.fn().mockResolvedValue('trip-uuid-unconfigured');
    const mockRepo: TripPersistenceRepository = {
      persist: persistMock,
    };

    const { result } = await renderHook(() => useTripPersistence(mockRepo));

    await act(async () => {
      await result.current.save(samplePreview, 'No Budget Trip', {
        estimatedBudget: null,
        currency: null,
      });
    });

    expect(persistMock).toHaveBeenCalledTimes(1);
    const callArg = persistMock.mock.calls[0][0];
    expect(callArg.graph.estimatedBudget).toBeNull();
    expect(callArg.graph.currency).toBeNull();
  });
});
