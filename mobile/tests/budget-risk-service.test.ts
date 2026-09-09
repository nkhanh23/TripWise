import { BudgetRiskService } from '../src/integration/remote/budgetRiskService';
import type { TripFxContextRepository, FxRateRepository } from '../src/integration/fxContract';
import type { TripExpenseAggregateRepository } from '../src/integration/expenseAggregate';
import { parseAccountingDecimal } from '../src/integration/expenseAggregate';
import type { TripId } from '../src/integration/contracts';
import { IntegrationError } from '../src/integration/errors';

const VALID_TRIP_ID = '12345678-1234-4234-8234-123456789abc' as TripId;
const FIXED_NOW = 1710000000000;

describe('FEATURE-P3-T004: BudgetRiskService Corrective Orchestration', () => {
  let mockTripFxRepo: jest.Mocked<TripFxContextRepository>;
  let mockAggregateRepo: jest.Mocked<TripExpenseAggregateRepository>;
  let mockFxRepo: jest.Mocked<FxRateRepository>;
  let service: BudgetRiskService;

  beforeEach(() => {
    mockTripFxRepo = {
      getTripFxContext: jest.fn(),
    };
    mockAggregateRepo = {
      getAggregate: jest.fn(),
    };
    mockFxRepo = {
      getQuotes: jest.fn(),
      getQuote: jest.fn(),
    };
    service = new BudgetRiskService(
      mockTripFxRepo,
      mockAggregateRepo,
      mockFxRepo,
      () => FIXED_NOW,
    );
  });

  it('orchestrates budget risk without FX when only home currency is spent', async () => {
    mockTripFxRepo.getTripFxContext.mockResolvedValue({
      tripId: VALID_TRIP_ID,
      originalBudget: { amount: '1000.00', currency: 'USD' },
      homeCurrency: 'USD',
      homeCurrencySource: 'originalBudget',
      destinationCurrency: null,
      destinationCurrencySource: 'unavailable',
    });

    mockAggregateRepo.getAggregate.mockResolvedValue({
      tripId: VALID_TRIP_ID,
      groupBy: 'currency',
      nextCursor: null,
      items: [
        {
          key: 'c|USD',
          currency: 'USD',
          category: null,
          day: null,
          planned: parseAccountingDecimal('100.00'),
          actual: parseAccountingDecimal('500.00'),
          unplanned: parseAccountingDecimal('0.00'),
          actualPlusUnplanned: parseAccountingDecimal('500.00'),
          variance: parseAccountingDecimal('400.00', true),
        },
      ],
    });

    const result = await service.evaluateTripBudgetRisk({ tripId: VALID_TRIP_ID });

    expect(result.tripId).toBe(VALID_TRIP_ID);
    expect(result.riskLevel).toBe('healthy');
    expect(result.amounts.realizedSpend).toBe('500.00');
    expect(result.amounts.totalBudget).toBe('1000.00');
    expect(mockFxRepo.getQuotes).not.toHaveBeenCalled();
  });

  it('deduplicates foreign currencies and fetches FX quotes once for both currency and category aggregates', async () => {
    mockTripFxRepo.getTripFxContext.mockResolvedValue({
      tripId: VALID_TRIP_ID,
      originalBudget: { amount: '1000.00', currency: 'USD' },
      homeCurrency: 'USD',
      homeCurrencySource: 'originalBudget',
      destinationCurrency: null,
      destinationCurrencySource: 'unavailable',
    });

    mockAggregateRepo.getAggregate
      .mockResolvedValueOnce({
        tripId: VALID_TRIP_ID,
        groupBy: 'currency',
        nextCursor: null,
        items: [
          {
            key: 'c|EUR',
            currency: 'EUR',
            category: null,
            day: null,
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('100.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('100.00'),
            variance: parseAccountingDecimal('100.00', true),
          },
        ],
      })
      .mockResolvedValueOnce({
        tripId: VALID_TRIP_ID,
        groupBy: 'category',
        nextCursor: null,
        items: [
          {
            key: 'k:food|EUR',
            currency: 'EUR',
            category: 'food',
            day: null,
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('100.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('100.00'),
            variance: parseAccountingDecimal('100.00', true),
          },
        ],
      });

    mockFxRepo.getQuotes.mockResolvedValue([
      {
        sourceCurrency: 'EUR',
        destinationCurrency: 'USD',
        state: 'fresh',
        reason: null,
        quote: {
          sourceCurrency: 'EUR',
          destinationCurrency: 'USD',
          rate: '1.100000000000000000',
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - 500).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      },
    ]);

    const result = await service.evaluateTripBudgetRisk({
      tripId: VALID_TRIP_ID,
      includeCategoryBreakdown: true,
    });

    expect(mockFxRepo.getQuotes).toHaveBeenCalledTimes(1);
    expect(mockFxRepo.getQuotes).toHaveBeenCalledWith(
      {
        pairs: [{ sourceCurrency: 'EUR', destinationCurrency: 'USD' }],
      },
      undefined,
    );
    expect(result.riskLevel).toBe('healthy');
    expect(result.amounts.realizedSpend).toBe('110.00'); // 100 EUR * 1.1 = 110.00 USD
    expect(result.categoryBreakdown.length).toBe(1);
    expect(result.categoryBreakdown[0].category).toBe('food');
    expect(result.categoryBreakdown[0].realizedSpend).toBe('110.00');
    expect(result.categoryBreakdown[0].fractionOfBudgetBasisPoints).toBe('1100');
  });

  describe('Defect 4: Bounded Category Pagination', () => {
    it('handles category page 2 correctly when nextCursor is present on page 1', async () => {
      mockTripFxRepo.getTripFxContext.mockResolvedValue({
        tripId: VALID_TRIP_ID,
        originalBudget: { amount: '1000.00', currency: 'USD' },
        homeCurrency: 'USD',
        homeCurrencySource: 'originalBudget',
        destinationCurrency: null,
        destinationCurrencySource: 'unavailable',
      });

      mockAggregateRepo.getAggregate
        // 1. Currency aggregate
        .mockResolvedValueOnce({
          tripId: VALID_TRIP_ID,
          groupBy: 'currency',
          nextCursor: null,
          items: [
            {
              key: 'c|USD',
              currency: 'USD',
              category: null,
              day: null,
              planned: parseAccountingDecimal('0.00'),
              actual: parseAccountingDecimal('900.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('900.00'),
              variance: parseAccountingDecimal('900.00', true),
            },
          ],
        })
        // 2. Category page 1
        .mockResolvedValueOnce({
          tripId: VALID_TRIP_ID,
          groupBy: 'category',
          nextCursor: 'k:food|USD',
          items: [
            {
              key: 'k:activity|USD',
              currency: 'USD',
              category: 'activity',
              day: null,
              planned: parseAccountingDecimal('0.00'),
              actual: parseAccountingDecimal('400.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('400.00'),
              variance: parseAccountingDecimal('400.00', true),
            },
            {
              key: 'k:food|USD',
              currency: 'USD',
              category: 'food',
              day: null,
              planned: parseAccountingDecimal('0.00'),
              actual: parseAccountingDecimal('500.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('500.00'),
              variance: parseAccountingDecimal('500.00', true),
            },
          ],
        })
        // 3. Category page 2
        .mockResolvedValueOnce({
          tripId: VALID_TRIP_ID,
          groupBy: 'category',
          nextCursor: null,
          items: [
            {
              key: 'k:transport|USD',
              currency: 'USD',
              category: 'transport',
              day: null,
              planned: parseAccountingDecimal('0.00'),
              actual: parseAccountingDecimal('0.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('0.00'),
              variance: parseAccountingDecimal('0.00', true),
            },
          ],
        });

      const result = await service.evaluateTripBudgetRisk({
        tripId: VALID_TRIP_ID,
        includeCategoryBreakdown: true,
      });

      expect(mockAggregateRepo.getAggregate).toHaveBeenCalledTimes(3);
      expect(result.riskLevel).toBe('warning');
      expect(result.categoryBreakdown.length).toBe(3);
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({ code: 'REVIEW_FOOD_SPEND' }),
      );
    });

    it('fails category breakdown closed if category pagination exceeds 2 pages (anomalous)', async () => {
      mockTripFxRepo.getTripFxContext.mockResolvedValue({
        tripId: VALID_TRIP_ID,
        originalBudget: { amount: '1000.00', currency: 'USD' },
        homeCurrency: 'USD',
        homeCurrencySource: 'originalBudget',
        destinationCurrency: null,
        destinationCurrencySource: 'unavailable',
      });

      mockAggregateRepo.getAggregate
        // 1. Currency aggregate
        .mockResolvedValueOnce({
          tripId: VALID_TRIP_ID,
          groupBy: 'currency',
          nextCursor: null,
          items: [
            {
              key: 'c|USD',
              currency: 'USD',
              category: null,
              day: null,
              planned: parseAccountingDecimal('0.00'),
              actual: parseAccountingDecimal('900.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('900.00'),
              variance: parseAccountingDecimal('900.00', true),
            },
          ],
        })
        // 2. Category page 1 with nextCursor
        .mockResolvedValueOnce({
          tripId: VALID_TRIP_ID,
          groupBy: 'category',
          nextCursor: 'k:food|USD',
          items: [
            {
              key: 'k:activity|USD',
              currency: 'USD',
              category: 'activity',
              day: null,
              planned: parseAccountingDecimal('0.00'),
              actual: parseAccountingDecimal('400.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('400.00'),
              variance: parseAccountingDecimal('400.00', true),
            },
          ],
        })
        // 3. Category page 2 STILL has nextCursor (more than 2 pages is not expected for max 72 groups)
        .mockResolvedValueOnce({
          tripId: VALID_TRIP_ID,
          groupBy: 'category',
          nextCursor: 'k:other|USD',
          items: [
            {
              key: 'k:food|USD',
              currency: 'USD',
              category: 'food',
              day: null,
              planned: parseAccountingDecimal('0.00'),
              actual: parseAccountingDecimal('500.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('500.00'),
              variance: parseAccountingDecimal('500.00', true),
            },
          ],
        });

      const result = await service.evaluateTripBudgetRisk({
        tripId: VALID_TRIP_ID,
        includeCategoryBreakdown: true,
      });

      expect(result.riskLevel).toBe('unavailable');
      expect(result.completeness).toBe('incomplete');
      expect(result.incompleteReasons).toContain('pagination_limit_exceeded');
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('Defect 2: Category Aggregate Alone Never Produces REVIEW_OPTIONAL_PAID_ACTIVITY', () => {
    it('service passes optionalPaidActivityReviewEligible=false, ensuring no removal suggestions are generated', async () => {
      mockTripFxRepo.getTripFxContext.mockResolvedValue({
        tripId: VALID_TRIP_ID,
        originalBudget: { amount: '1000.00', currency: 'USD' },
        homeCurrency: 'USD',
        homeCurrencySource: 'originalBudget',
        destinationCurrency: null,
        destinationCurrencySource: 'unavailable',
      });

      mockAggregateRepo.getAggregate
        .mockResolvedValueOnce({
          tripId: VALID_TRIP_ID,
          groupBy: 'currency',
          nextCursor: null,
          items: [
            {
              key: 'c|USD',
              currency: 'USD',
              category: null,
              day: null,
              planned: parseAccountingDecimal('200.00'),
              actual: parseAccountingDecimal('850.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('850.00'),
              variance: parseAccountingDecimal('650.00', true),
            },
          ],
        })
        .mockResolvedValueOnce({
          tripId: VALID_TRIP_ID,
          groupBy: 'category',
          nextCursor: null,
          items: [
            {
              key: 'k:activity|USD',
              currency: 'USD',
              category: 'activity',
              day: null,
              planned: parseAccountingDecimal('200.00'),
              actual: parseAccountingDecimal('0.00'),
              unplanned: parseAccountingDecimal('0.00'),
              actualPlusUnplanned: parseAccountingDecimal('0.00'),
              variance: parseAccountingDecimal('-200.00', true),
            },
          ],
        });

      const result = await service.evaluateTripBudgetRisk({
        tripId: VALID_TRIP_ID,
        includeCategoryBreakdown: true,
      });

      expect(result.riskLevel).toBe('warning');
      expect(result.suggestions.some(s => s.code === 'REVIEW_OPTIONAL_PAID_ACTIVITY')).toBe(false);
      expect(result.suggestions.some(s => s.code === 'LOOK_FOR_FREE_ALTERNATIVE')).toBe(false);
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({ code: 'REDUCE_DAILY_SPENDING' }),
      );
    });
  });

  describe('Cancellation & Signal Safety', () => {
    it('handles cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        service.evaluateTripBudgetRisk({ tripId: VALID_TRIP_ID }, controller.signal),
      ).rejects.toThrow(IntegrationError);
    });
  });
});
