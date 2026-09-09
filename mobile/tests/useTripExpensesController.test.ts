import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

import type {
  CreateTripExpenseCommand,
  TripExpenseRecord,
  TripExpensesPage,
  TripId,
} from '../src/integration/contracts';
import type { AccountingDecimal, ExpenseAggregatePage } from '../src/integration/expenseAggregate';
import type { FxPair, FxQuote, FxQuotesRequest, FxRateRepository, FxResult, TripFxContext } from '../src/integration/fxContract';
import { BudgetRiskService } from '../src/integration/remote/budgetRiskService';
import type { BudgetRiskResult } from '../src/integration/budgetRiskContract';
import {
  MAX_LEDGER_ITEMS,
  parseQuickExpenseAmount,
  useTripExpensesController,
} from '../src/features/trips/useTripExpensesController';

// Mock useAuth
let mockCurrentUser: { id: string } | null = {
  id: '00000000-0000-4000-8000-000000000001',
};
jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    status: mockCurrentUser ? 'authenticated' : 'unauthenticated',
  }),
}));

jest.mock('../src/lib/supabase/client', () => ({
  supabase: {},
}));

const testTripId = '11111111-1111-4111-8111-111111111111';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const sampleFxContext: TripFxContext = {
  tripId: testTripId,
  originalBudget: { amount: '1000.00', currency: 'USD' },
  homeCurrency: 'USD',
  homeCurrencySource: 'originalBudget',
  destinationCurrency: null,
  destinationCurrencySource: 'unavailable',
};

const sampleAggregate: ExpenseAggregatePage = {
  tripId: testTripId as TripId,
  groupBy: 'currency',
  items: [
    {
      key: 'USD',
      currency: 'USD',
      category: null,
      day: null,
      planned: '100.00' as AccountingDecimal,
      actual: '200.00' as AccountingDecimal,
      unplanned: '50.00' as AccountingDecimal,
      actualPlusUnplanned: '250.00' as AccountingDecimal,
      variance: '-150.00' as AccountingDecimal,
    },
  ],
  nextCursor: null,
};

const sampleExpenses: TripExpenseRecord[] = [
  {
    id: 'exp-1' as any,
    tripId: testTripId as TripId,
    itineraryItemId: null,
    category: 'food',
    origin: 'actual',
    amount: 50.0,
    currency: 'USD',
    note: 'Dinner',
    spentAt: '2028-01-01T18:00:00.000Z',
    createdAt: '2028-01-01T18:00:00.000Z',
    updatedAt: '2028-01-01T18:00:00.000Z',
  },
];

const sampleBudgetRisk: BudgetRiskResult = {
  tripId: testTripId as TripId,
  riskLevel: 'healthy',
  completeness: 'complete',
  incompleteReasons: [],
  policyVersion: 'TRIPWISE_BUDGET_RISK_V1',
  evaluatedAt: '2028-01-01T18:00:00.000Z',
  amounts: {
    totalBudget: '1000.00',
    budgetCurrency: 'USD',
    realizedSpend: '250.00',
    plannedCommitments: '100.00',
    remainingBudget: '750.00',
    currencyFractionDigits: 2,
  },
  categoryBreakdown: [],
  suggestions: [
    {
      code: 'MAINTAIN_CURRENT_PACE',
      impactLevel: 'low',
    },
  ],
  fxConversionsApplied: [],
};

describe('useTripExpensesController', () => {
  let mockFxContextRepo: any;
  let mockAggregateRepo: any;
  let mockLedgerRepo: any;
  let mockFxRepo: FxRateRepository;
  let mockBudgetRiskService: any;

  beforeEach(() => {
    mockCurrentUser = { id: '00000000-0000-4000-8000-000000000001' };
    mockFxContextRepo = {
      getTripFxContext: jest.fn().mockResolvedValue(sampleFxContext),
    };
    mockAggregateRepo = {
      getAggregate: jest.fn().mockResolvedValue(sampleAggregate),
    };
    mockLedgerRepo = {
      listExpenses: jest.fn().mockResolvedValue({ items: sampleExpenses, nextCursor: null }),
      createExpense: jest.fn().mockImplementation((cmd: CreateTripExpenseCommand) => {
        return Promise.resolve({
          id: 'exp-new',
          ...cmd,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }),
    };
    const freshIso = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
    mockFxRepo = {
      getQuotes: jest.fn().mockImplementation((req: FxQuotesRequest) => {
        return Promise.resolve(
          req.pairs.map((p) => ({
            sourceCurrency: p.sourceCurrency,
            destinationCurrency: p.destinationCurrency,
            state: 'fresh' as const,
            reason: null,
            quote: {
              sourceCurrency: p.sourceCurrency,
              destinationCurrency: p.destinationCurrency!,
              rate: '25000',
              provider: 'exchangerate-api-open' as const,
              quotedAt: freshIso,
              fetchedAt: freshIso,
              timestampPrecision: 'second' as const,
              sourceId: 'exchangerate-api-composite-usd' as const,
              rateBasis: 'usd-cross-half-up-18dp' as const,
              attribution: 'Rates By Exchange Rate API',
            },
          }))
        );
      }),
      getQuote: jest.fn().mockImplementation((pair: FxPair) => {
        return Promise.resolve({
          sourceCurrency: pair.sourceCurrency,
          destinationCurrency: pair.destinationCurrency,
          state: 'fresh' as const,
          reason: null,
          quote: {
            sourceCurrency: pair.sourceCurrency,
            destinationCurrency: pair.destinationCurrency!,
            rate: '25000',
            provider: 'exchangerate-api-open' as const,
            quotedAt: freshIso,
            fetchedAt: freshIso,
            timestampPrecision: 'second' as const,
            sourceId: 'exchangerate-api-composite-usd' as const,
            rateBasis: 'usd-cross-half-up-18dp' as const,
            attribution: 'Rates By Exchange Rate API',
          },
        });
      }),
    };
    mockBudgetRiskService = {
      evaluateTripBudgetRisk: jest.fn().mockResolvedValue(sampleBudgetRisk),
    };
  });

  afterEach(cleanup);

  it('loads context, aggregate, expenses, and budget risk on initial render', async () => {
    const { result } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tripFxContext).toEqual(sampleFxContext);
    expect(result.current.aggregate).toEqual(sampleAggregate);
    expect(result.current.expenses).toEqual(sampleExpenses);
    expect(result.current.budgetRisk).toEqual(sampleBudgetRisk);
    expect(result.current.errorKey).toBeNull();
  });

  it('handles quick expense submission and refreshes ledger data', async () => {
    const { result } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.openQuickAdd();
      result.current.updateDraft('amount', '75.50');
      result.current.updateDraft('currency', 'USD');
      result.current.updateDraft('category', 'food');
      result.current.updateDraft('origin', 'actual');
      result.current.updateDraft('note', 'Lunch with team');
    });

    expect(result.current.quickAddVisible).toBe(true);

    let submitSuccess = false;
    await act(async () => {
      submitSuccess = await result.current.submitQuickExpense();
    });

    expect(submitSuccess).toBe(true);
    expect(mockLedgerRepo.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: testTripId,
        amount: 75.5,
        currency: 'USD',
        category: 'food',
        origin: 'actual',
        note: 'Lunch with team',
      }),
      expect.anything()
    );

    expect(result.current.quickAddVisible).toBe(false);
    expect(mockLedgerRepo.listExpenses).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed quick expense text before mutation', async () => {
    const { result } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.updateDraft('amount', '1abc');
    });

    let submitSuccess = true;
    await act(async () => {
      submitSuccess = await result.current.submitQuickExpense();
    });

    expect(submitSuccess).toBe(false);
    expect(mockLedgerRepo.createExpense).not.toHaveBeenCalled();
  });

  it.each([
    '',
    ' 1',
    '1 ',
    '1abc',
    '1e3',
    '1.234',
    '.50',
    '00.50',
    'NaN',
    'Infinity',
    '0',
    '-1',
    '10000000000',
  ])('rejects malformed or out-of-range quick amount %j', (invalid) => {
    expect(parseQuickExpenseAmount(invalid)).toBeNull();
  });

  it('parses only the accepted T001 two-decimal positive range', () => {
    expect(parseQuickExpenseAmount('0.01')).toBe(0.01);
    expect(parseQuickExpenseAmount('9999999999.99')).toBe(9_999_999_999.99);
    expect(parseQuickExpenseAmount('1.2')).toBe(1.2);
  });

  it('handles currency conversion via getConvertedAmount accurately', async () => {
    const { result } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        initialDisplayCurrency: 'VND',
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // When converting 10.00 USD to VND with rate 25000:
    const conversion = result.current.getConvertedAmount(10.0, 'USD');
    expect(conversion.state).toBe('fresh');
    expect(conversion.rate).toBe('25000');
    expect(conversion.convertedFormatted).toBe('250000 VND');

    // When fromCurrency is same as displayCurrency (identity):
    const identity = result.current.getConvertedAmount(250000, 'VND');
    expect(identity.state).toBe('identity');
    expect(identity.convertedFormatted).toBeNull();
  });

  it('handles provider failure gracefully and marks rates unavailable', async () => {
    const failingFxRepo: FxRateRepository = {
      getQuotes: jest.fn().mockImplementation((req: FxQuotesRequest) => {
        return Promise.resolve(
          req.pairs.map((p) => ({
            sourceCurrency: p.sourceCurrency,
            destinationCurrency: p.destinationCurrency,
            state: 'unavailable' as const,
            reason: 'providerUnavailable' as const,
            quote: null,
          }))
        );
      }),
      getQuote: jest.fn().mockImplementation((pair: FxPair) => {
        return Promise.resolve({
          sourceCurrency: pair.sourceCurrency,
          destinationCurrency: pair.destinationCurrency,
          state: 'unavailable' as const,
          reason: 'providerUnavailable' as const,
          quote: null,
        });
      }),
    };

    const { result } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        initialDisplayCurrency: 'VND',
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: failingFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ratesState).toBe('unavailable');
    const conversion = result.current.getConvertedAmount(10.0, 'USD');
    expect(conversion.state).toBe('unavailable');
    expect(conversion.convertedFormatted).toBeNull();
  });

  it('ignores a delayed user A ledger read after switching to user B', async () => {
    const delayedA = deferred<TripExpensesPage>();
    let userASignal: AbortSignal | undefined;
    const userBExpense = { ...sampleExpenses[0], id: 'exp-b' as any, note: 'User B expense' };
    mockLedgerRepo.listExpenses
      .mockImplementationOnce((_request: unknown, signal: AbortSignal) => {
        userASignal = signal;
        return delayedA.promise;
      })
      .mockResolvedValueOnce({ items: [userBExpense], nextCursor: null });

    const { result, rerender } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );
    await waitFor(() => expect(mockLedgerRepo.listExpenses).toHaveBeenCalledTimes(1));

    mockCurrentUser = { id: '00000000-0000-4000-8000-000000000002' };
    await rerender(undefined);
    await waitFor(() => expect(result.current.expenses).toEqual([userBExpense]));
    expect(userASignal?.aborted).toBe(true);

    await act(async () => {
      delayedA.resolve({ items: sampleExpenses, nextCursor: null });
      await delayedA.promise;
    });
    expect(result.current.expenses).toEqual([userBExpense]);
  });

  it('ignores delayed user A budget-risk and display-FX responses after switching to B', async () => {
    const delayedRiskA = deferred<BudgetRiskResult>();
    const riskB: BudgetRiskResult = {
      ...sampleBudgetRisk,
      riskLevel: 'warning',
      amounts: { ...sampleBudgetRisk.amounts, realizedSpend: '850.00', remainingBudget: '150.00' },
    };
    mockBudgetRiskService.evaluateTripBudgetRisk
      .mockImplementationOnce(() => delayedRiskA.promise)
      .mockResolvedValueOnce(riskB);

    const { result, rerender } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        initialDisplayCurrency: 'VND',
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );
    await waitFor(() =>
      expect(mockBudgetRiskService.evaluateTripBudgetRisk).toHaveBeenCalledTimes(1)
    );

    mockCurrentUser = { id: '00000000-0000-4000-8000-000000000002' };
    await rerender(undefined);
    await waitFor(() => expect(result.current.budgetRisk?.riskLevel).toBe('warning'));

    await act(async () => {
      delayedRiskA.resolve(sampleBudgetRisk);
      await delayedRiskA.promise;
    });
    expect(result.current.budgetRisk?.riskLevel).toBe('warning');

    const delayedFxA = deferred<FxResult[]>();
    const freshIso = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
    const resultForRate = (rate: string): FxResult => ({
      sourceCurrency: 'USD',
      destinationCurrency: 'VND',
      state: 'fresh',
      reason: null,
      quote: {
        sourceCurrency: 'USD',
        destinationCurrency: 'VND',
        rate,
        provider: 'exchangerate-api-open',
        quotedAt: freshIso,
        fetchedAt: freshIso,
        timestampPrecision: 'second',
        sourceId: 'exchangerate-api-composite-usd',
        rateBasis: 'usd-cross-half-up-18dp',
        attribution: 'Rates By Exchange Rate API',
      },
    });
    mockFxRepo.getQuotes = jest
      .fn()
      .mockImplementationOnce(() => delayedFxA.promise)
      .mockResolvedValueOnce([resultForRate('24000')]);

    mockCurrentUser = { id: '00000000-0000-4000-8000-000000000003' };
    await rerender(undefined);
    await waitFor(() => expect(mockFxRepo.getQuotes).toHaveBeenCalledTimes(1));
    mockCurrentUser = { id: '00000000-0000-4000-8000-000000000004' };
    await rerender(undefined);
    await waitFor(() => expect(result.current.getConvertedAmount(1, 'USD').rate).toBe('24000'));

    await act(async () => {
      delayedFxA.resolve([resultForRate('25000')]);
      await delayedFxA.promise;
    });
    expect(result.current.getConvertedAmount(1, 'USD').rate).toBe('24000');
  });

  it('aborts and suppresses a stale mutation completion on sign-out', async () => {
    const delayedMutation = deferred<TripExpenseRecord>();
    let mutationSignal: AbortSignal | undefined;
    mockLedgerRepo.createExpense.mockImplementation(
      (_command: CreateTripExpenseCommand, signal: AbortSignal) => {
        mutationSignal = signal;
        return delayedMutation.promise;
      }
    );
    const { result, rerender } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      result.current.updateDraft('amount', '12.34');
    });
    expect(result.current.quickExpenseDraft.amount).toBe('12.34');

    let submission!: Promise<boolean>;
    await act(async () => {
      submission = result.current.submitQuickExpense();
    });
    await waitFor(() => expect(mockLedgerRepo.createExpense).toHaveBeenCalledTimes(1));
    mockCurrentUser = null;
    await rerender(undefined);
    expect(result.current.expenses).toEqual([]);
    expect(result.current.budgetRisk).toBeNull();
    expect(mutationSignal?.aborted).toBe(true);

    await act(async () => {
      delayedMutation.resolve(sampleExpenses[0]);
      expect(await submission).toBe(false);
    });
    expect(mockLedgerRepo.listExpenses).toHaveBeenCalledTimes(1);
    expect(result.current.expenses).toEqual([]);
  });

  it('uses the cursor once, deduplicates IDs, stops at null, and refreshes page one', async () => {
    const cursor = {
      createdAt: '2028-01-01T18:00:00.000Z',
      id: '22222222-2222-4222-8222-222222222222' as any,
    };
    const secondExpense = {
      ...sampleExpenses[0],
      id: '33333333-3333-4333-8333-333333333333' as any,
      note: 'Second page',
    };
    mockLedgerRepo.listExpenses
      .mockResolvedValueOnce({ items: sampleExpenses, nextCursor: cursor })
      .mockResolvedValueOnce({ items: [sampleExpenses[0], secondExpense], nextCursor: null })
      .mockResolvedValueOnce({ items: [secondExpense], nextCursor: null });

    const { result } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );
    await waitFor(() => expect(result.current.nextCursor).toEqual(cursor));

    await act(async () => {
      await Promise.all([result.current.loadMore(), result.current.loadMore()]);
    });
    expect(mockLedgerRepo.listExpenses).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(result.current.expenses).toEqual([sampleExpenses[0], secondExpense])
    );
    expect(result.current.nextCursor).toBeNull();

    await act(async () => result.current.loadMore());
    expect(mockLedgerRepo.listExpenses).toHaveBeenCalledTimes(2);
    await act(async () => result.current.refresh());
    expect(result.current.expenses).toEqual([secondExpense]);
    expect(mockLedgerRepo.listExpenses).toHaveBeenCalledTimes(3);
  });

  it('changes display currency without refetching core financial data or fanning out per expense', async () => {
    const { result, rerender } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFxRepo.getQuotes).not.toHaveBeenCalled();

    await act(async () => result.current.setDisplayCurrency('VND'));
    await rerender(undefined);
    await waitFor(() => expect(mockFxRepo.getQuotes).toHaveBeenCalledTimes(1));
    expect(mockFxRepo.getQuotes).toHaveBeenCalledWith(
      { pairs: [{ sourceCurrency: 'USD', destinationCurrency: 'VND' }] },
      expect.anything()
    );
    expect(mockAggregateRepo.getAggregate).toHaveBeenCalledTimes(1);
    expect(mockLedgerRepo.listExpenses).toHaveBeenCalledTimes(1);
    expect(mockBudgetRiskService.evaluateTripBudgetRisk).toHaveBeenCalledTimes(1);

    await rerender(undefined);
    expect(mockFxRepo.getQuotes).toHaveBeenCalledTimes(1);
    expect(mockAggregateRepo.getAggregate).toHaveBeenCalledTimes(1);
  });

  it('caps retained ledger state even if a malformed repository page exceeds the bound', async () => {
    const oversized = Array.from({ length: MAX_LEDGER_ITEMS + 1 }, (_, index) => ({
      ...sampleExpenses[0],
      id: `expense-${index}` as any,
    }));
    mockLedgerRepo.listExpenses.mockResolvedValueOnce({
      items: oversized,
      nextCursor: {
        createdAt: '2028-01-01T18:00:00.000Z',
        id: '22222222-2222-4222-8222-222222222222' as any,
      },
    });
    const { result } = await renderHook(() =>
      useTripExpensesController(testTripId, {
        fxContextRepoOverride: mockFxContextRepo,
        aggregateRepoOverride: mockAggregateRepo,
        ledgerRepoOverride: mockLedgerRepo,
        fxRepoOverride: mockFxRepo,
        budgetRiskServiceOverride: mockBudgetRiskService,
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.expenses).toHaveLength(MAX_LEDGER_ITEMS);
    expect(result.current.ledgerLimitReached).toBe(true);
    expect(result.current.nextCursor).toBeNull();
  });
});
