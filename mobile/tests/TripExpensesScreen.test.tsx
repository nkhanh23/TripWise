import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { TripExpensesScreen } from '../src/features/trips/screens/TripExpensesScreen';
import type { TripExpenseRecord, TripId } from '../src/integration/contracts';
import type { ExpenseAggregatePage, AccountingDecimal } from '../src/integration/expenseAggregate';
import type { FxRateRepository, FxQuotesRequest, FxPair, TripFxContext } from '../src/integration/fxContract';
import type { BudgetRiskResult } from '../src/integration/budgetRiskContract';
import { ThemeProvider } from '../src/theme';
import { TranslationProvider } from '../src/i18n';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../src/lib/supabase/client', () => ({
  supabase: {},
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
      visible ? children : null,
  };
});

jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-000000000001' }, status: 'authenticated' }),
}));

const testTripId = '11111111-1111-4111-8111-111111111111';

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
      planned: '0.00' as AccountingDecimal,
      actual: '150.00' as AccountingDecimal,
      unplanned: '0.00' as AccountingDecimal,
      actualPlusUnplanned: '150.00' as AccountingDecimal,
      variance: '-150.00' as AccountingDecimal,
    },
    {
      key: 'VND',
      currency: 'VND',
      category: null,
      day: null,
      planned: '0.00' as AccountingDecimal,
      actual: '250000.00' as AccountingDecimal,
      unplanned: '0.00' as AccountingDecimal,
      actualPlusUnplanned: '250000.00' as AccountingDecimal,
      variance: '-250000.00' as AccountingDecimal,
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
    amount: 150.0,
    currency: 'USD',
    note: 'Welcome seafood dinner',
    spentAt: '2028-01-01T18:00:00.000Z',
    createdAt: '2028-01-01T18:00:00.000Z',
    updatedAt: '2028-01-01T18:00:00.000Z',
  },
  {
    id: 'exp-2' as any,
    tripId: testTripId as TripId,
    itineraryItemId: null,
    category: 'transport',
    origin: 'actual',
    amount: 250000.0,
    currency: 'VND',
    note: 'Taxi to hotel',
    spentAt: '2028-01-01T19:00:00.000Z',
    createdAt: '2028-01-01T19:00:00.000Z',
    updatedAt: '2028-01-01T19:00:00.000Z',
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
    realizedSpend: '150.00',
    plannedCommitments: '0.00',
    remainingBudget: '850.00',
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

const mockNavigation = {
  canGoBack: () => true,
  goBack: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

describe('TripExpensesScreen', () => {
  afterEach(cleanup);

  const createMockRepos = (expenses: TripExpenseRecord[] = sampleExpenses) => {
    const fxContextRepo = {
      getTripFxContext: jest.fn().mockResolvedValue(sampleFxContext),
    };
    const aggregateRepo = {
      getAggregate: jest.fn().mockResolvedValue(sampleAggregate),
    };
    const ledgerRepo = {
      listExpenses: jest.fn().mockResolvedValue({ items: expenses, nextCursor: null }),
      createExpense: jest.fn().mockResolvedValue(sampleExpenses[0]),
    };
    const freshIso = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
    const fxRepo: FxRateRepository = {
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
    const budgetRiskService = {
      evaluateTripBudgetRisk: jest.fn().mockResolvedValue(sampleBudgetRisk),
    };

    return { fxContextRepo, aggregateRepo, ledgerRepo, fxRepo, budgetRiskService };
  };

  it('renders budget summary metrics, risk banner, and expense items', async () => {
    const repos = createMockRepos();

    await render(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">
          <TripExpensesScreen
            controllerOptions={{
              fxContextRepoOverride: repos.fxContextRepo as any,
              aggregateRepoOverride: repos.aggregateRepo as any,
              ledgerRepoOverride: repos.ledgerRepo as any,
              fxRepoOverride: repos.fxRepo,
              budgetRiskServiceOverride: repos.budgetRiskService as any,
            }}
            navigation={mockNavigation as any}
            route={{ key: 'TripExpenses', name: 'TripExpenses', params: { tripId: testTripId } }}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    // Wait for loaded content
    await screen.findByText('Budget Summary');

    // Budget Summary labels and values
    expect(screen.getByText('Budget Summary')).toBeTruthy();
    expect(screen.getByText('Original Budget')).toBeTruthy();
    expect(screen.getByText('Realized Spend')).toBeTruthy();
    expect(screen.getByText('Remaining Budget')).toBeTruthy();

    // Risk Banner
    expect(screen.getByText('Healthy pace')).toBeTruthy();
    expect(screen.getByText('Spending is well within budget limits')).toBeTruthy();

    // FX Attribution
    expect(screen.getByText('Rates By Exchange Rate API')).toBeTruthy();

    // Expense Item
    expect(screen.getByText('Welcome seafood dinner')).toBeTruthy();
  });

  it('renders empty state when trip has no recorded expenses', async () => {
    const repos = createMockRepos([]);

    await render(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">
          <TripExpensesScreen
            controllerOptions={{
              fxContextRepoOverride: repos.fxContextRepo as any,
              aggregateRepoOverride: repos.aggregateRepo as any,
              ledgerRepoOverride: repos.ledgerRepo as any,
              fxRepoOverride: repos.fxRepo,
              budgetRiskServiceOverride: repos.budgetRiskService as any,
            }}
            navigation={mockNavigation as any}
            route={{ key: 'TripExpenses', name: 'TripExpenses', params: { tripId: testTripId } }}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    await screen.findByText('No expenses recorded');
    expect(screen.getByText('No expenses recorded')).toBeTruthy();
  });

  it('opens quick add expense modal upon clicking Add Expense', async () => {
    const repos = createMockRepos();

    await render(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">
          <TripExpensesScreen
            controllerOptions={{
              fxContextRepoOverride: repos.fxContextRepo as any,
              aggregateRepoOverride: repos.aggregateRepo as any,
              ledgerRepoOverride: repos.ledgerRepo as any,
              fxRepoOverride: repos.fxRepo,
              budgetRiskServiceOverride: repos.budgetRiskService as any,
            }}
            navigation={mockNavigation as any}
            route={{ key: 'TripExpenses', name: 'TripExpenses', params: { tripId: testTripId } }}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    await screen.findByText('Budget Summary');

    const addButtons = screen.getAllByRole('button', { name: 'Add Expense' });
    fireEvent.press(addButtons[0]);

    // Modal opens showing fields
    expect(await screen.findByText('Amount *')).toBeTruthy();
    expect(screen.getByText('Save Expense')).toBeTruthy();
  });

  it('keeps all T004 summary amounts and progress in the persisted budget currency', async () => {
    const repos = createMockRepos();
    await render(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">
          <TripExpensesScreen
            controllerOptions={{
              initialDisplayCurrency: 'VND',
              fxContextRepoOverride: repos.fxContextRepo as any,
              aggregateRepoOverride: repos.aggregateRepo as any,
              ledgerRepoOverride: repos.ledgerRepo as any,
              fxRepoOverride: repos.fxRepo,
              budgetRiskServiceOverride: repos.budgetRiskService as any,
            }}
            navigation={mockNavigation as any}
            route={{ key: 'TripExpenses', name: 'TripExpenses', params: { tripId: testTripId } }}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    await screen.findByText('Display preference (not destination currency): VND');
    expect(screen.getByText('$1,000')).toBeTruthy();
    expect(screen.getAllByText('$150').length).toBeGreaterThan(0);
    expect(screen.getByText('$850')).toBeTruthy();
    expect(screen.getByText('15%')).toBeTruthy();
    expect(screen.queryByText('150 ₫')).toBeNull();
    expect(screen.queryByText('850 ₫')).toBeNull();
  });

  it('shows original amounts with no attribution or fake conversion when FX is unavailable', async () => {
    const repos = createMockRepos();
    (repos.fxRepo.getQuotes as jest.Mock).mockImplementation((request: FxQuotesRequest) =>
      Promise.resolve(
        request.pairs.map((pair) => ({
          sourceCurrency: pair.sourceCurrency,
          destinationCurrency: pair.destinationCurrency,
          state: 'unavailable' as const,
          reason: 'providerUnavailable' as const,
          quote: null,
        }))
      )
    );

    await render(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">
          <TripExpensesScreen
            controllerOptions={{
              initialDisplayCurrency: 'VND',
              fxContextRepoOverride: repos.fxContextRepo as any,
              aggregateRepoOverride: repos.aggregateRepo as any,
              ledgerRepoOverride: repos.ledgerRepo as any,
              fxRepoOverride: repos.fxRepo,
              budgetRiskServiceOverride: repos.budgetRiskService as any,
            }}
            navigation={mockNavigation as any}
            route={{ key: 'TripExpenses', name: 'TripExpenses', params: { tripId: testTripId } }}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    await screen.findByText(/Live exchange rates are currently unavailable/);
    expect(screen.getAllByText('$150').length).toBeGreaterThan(0);
    expect(screen.queryByText('Rates By Exchange Rate API')).toBeNull();
    expect(screen.queryByText(/^≈/)).toBeNull();
  });

  it('does not imply provider attribution for identity-only display', async () => {
    const repos = createMockRepos([sampleExpenses[0]]);
    repos.aggregateRepo.getAggregate.mockResolvedValue({
      ...sampleAggregate,
      items: [sampleAggregate.items[0]],
    });
    await render(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">
          <TripExpensesScreen
            controllerOptions={{
              initialDisplayCurrency: 'USD',
              fxContextRepoOverride: repos.fxContextRepo as any,
              aggregateRepoOverride: repos.aggregateRepo as any,
              ledgerRepoOverride: repos.ledgerRepo as any,
              fxRepoOverride: repos.fxRepo,
              budgetRiskServiceOverride: repos.budgetRiskService as any,
            }}
            navigation={mockNavigation as any}
            route={{ key: 'TripExpenses', name: 'TripExpenses', params: { tripId: testTripId } }}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    await screen.findByText('Budget Summary');
    expect(repos.fxRepo.getQuotes).not.toHaveBeenCalled();
    expect(screen.queryByText('Rates By Exchange Rate API')).toBeNull();
  });

  it('labels stale converted values and preserves exact provider attribution', async () => {
    const repos = createMockRepos();
    const staleAt = new Date(
      Math.floor((Date.now() - 2 * 60 * 60_000) / 1000) * 1000
    ).toISOString();
    (repos.fxRepo.getQuotes as jest.Mock).mockImplementation((request: FxQuotesRequest) =>
      Promise.resolve(
        request.pairs.map((pair) => ({
          sourceCurrency: pair.sourceCurrency,
          destinationCurrency: pair.destinationCurrency,
          state: 'stale' as const,
          reason: null,
          quote: {
            sourceCurrency: pair.sourceCurrency,
            destinationCurrency: pair.destinationCurrency!,
            rate: '25000',
            provider: 'exchangerate-api-open' as const,
            quotedAt: staleAt,
            fetchedAt: staleAt,
            timestampPrecision: 'second' as const,
            sourceId: 'exchangerate-api-composite-usd' as const,
            rateBasis: 'usd-cross-half-up-18dp' as const,
            attribution: 'Rates By Exchange Rate API',
          },
        }))
      )
    );

    await render(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">
          <TripExpensesScreen
            controllerOptions={{
              initialDisplayCurrency: 'VND',
              fxContextRepoOverride: repos.fxContextRepo as any,
              aggregateRepoOverride: repos.aggregateRepo as any,
              ledgerRepoOverride: repos.ledgerRepo as any,
              fxRepoOverride: repos.fxRepo,
              budgetRiskServiceOverride: repos.budgetRiskService as any,
            }}
            navigation={mockNavigation as any}
            route={{ key: 'TripExpenses', name: 'TripExpenses', params: { tripId: testTripId } }}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    await screen.findByText(/Cached exchange rates are stale/);
    expect(screen.getByText('Rates By Exchange Rate API')).toBeTruthy();
    expect(screen.getByText(/stale rate/)).toBeTruthy();
  });

  it('loads the next ledger cursor and deduplicates repeated expense IDs', async () => {
    const repos = createMockRepos();
    const cursor = {
      createdAt: '2028-01-01T18:00:00.000Z',
      id: '22222222-2222-4222-8222-222222222222',
    };
    const nextExpense = {
      ...sampleExpenses[0],
      id: '33333333-3333-4333-8333-333333333333' as any,
      note: 'Loaded from page two',
    };
    repos.ledgerRepo.listExpenses
      .mockResolvedValueOnce({ items: [sampleExpenses[0]], nextCursor: cursor })
      .mockResolvedValueOnce({ items: [sampleExpenses[0], nextExpense], nextCursor: null });

    await render(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en">
          <TripExpensesScreen
            controllerOptions={{
              fxContextRepoOverride: repos.fxContextRepo as any,
              aggregateRepoOverride: repos.aggregateRepo as any,
              ledgerRepoOverride: repos.ledgerRepo as any,
              fxRepoOverride: repos.fxRepo,
              budgetRiskServiceOverride: repos.budgetRiskService as any,
            }}
            navigation={mockNavigation as any}
            route={{ key: 'TripExpenses', name: 'TripExpenses', params: { tripId: testTripId } }}
          />
        </TranslationProvider>
      </ThemeProvider>
    );

    fireEvent.press(await screen.findByRole('button', { name: 'Load more' }));
    await screen.findByText('Loaded from page two');
    expect(screen.getAllByText('Welcome seafood dinner')).toHaveLength(1);
    expect(repos.ledgerRepo.listExpenses).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });
});
