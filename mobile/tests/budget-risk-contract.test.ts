import {
  evaluateBudgetRisk,
  type BudgetRiskEvaluationInput,
} from '../src/integration/budgetRiskContract';
import { type TripFxContext, type FxResult } from '../src/integration/fxContract';
import { parseAccountingDecimal } from '../src/integration/expenseAggregate';
import type { TripId } from '../src/integration/contracts';

const VALID_TRIP_ID = '12345678-1234-4234-8234-123456789abc' as TripId;
const FIXED_NOW = 1710000000000;

function createTripFxContext(amount: string | null, currency: string | null): TripFxContext {
  return {
    tripId: VALID_TRIP_ID,
    originalBudget: { amount, currency },
    homeCurrency: currency,
    homeCurrencySource: 'originalBudget',
    destinationCurrency: null,
    destinationCurrencySource: 'unavailable',
  };
}

describe('FEATURE-P3-T004: Corrective Budget Risk Contract & Pure Evaluator', () => {
  describe('Not Configured Edge Cases', () => {
    it('returns not_configured when originalBudget.amount is null', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext(null, 'USD'),
        currencyAggregates: [],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('not_configured');
      expect(result.completeness).toBe('incomplete');
      expect(result.incompleteReasons).toEqual(['no_budget_configured']);
      expect(result.amounts.totalBudget).toBeNull();
      expect(result.amounts.realizedSpend).toBeNull();
      expect(result.suggestions).toEqual([]);
    });

    it('returns not_configured when originalBudget.currency is null', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', null),
        currencyAggregates: [],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('not_configured');
      expect(result.completeness).toBe('incomplete');
      expect(result.incompleteReasons).toEqual(['no_budget_configured']);
    });
  });

  describe('Healthy Threshold (< 80%)', () => {
    it('evaluates healthy when spend is 0 on a positive budget', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('200.00'),
            actual: parseAccountingDecimal('0.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('0.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('healthy');
      expect(result.completeness).toBe('complete');
      expect(result.incompleteReasons).toEqual([]);
      expect(result.amounts.totalBudget).toBe('1000.00');
      expect(result.amounts.realizedSpend).toBe('0.00');
      expect(result.amounts.plannedCommitments).toBe('200.00');
      expect(result.amounts.remainingBudget).toBe('1000.00');
      expect(result.suggestions).toEqual([
        { code: 'MAINTAIN_CURRENT_PACE', category: 'general', impactLevel: 'low' },
      ]);
    });

    it('evaluates healthy when spend is exactly 79.99%', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('799.90'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('799.90'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('healthy');
      expect(result.amounts.realizedSpend).toBe('799.90');
      expect(result.amounts.remainingBudget).toBe('200.10');
    });
  });

  describe('Warning Threshold (80% - 100% or Planned > 100%)', () => {
    it('evaluates warning when realized spend is exactly 80.00%', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('800.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('800.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('warning');
      expect(result.amounts.realizedSpend).toBe('800.00');
      expect(result.amounts.remainingBudget).toBe('200.00');
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({ code: 'REDUCE_DAILY_SPENDING', impactLevel: 'medium' })
      );
    });

    it('evaluates warning when realized spend is exactly 100.00%', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('1000.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('1000.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('warning');
      expect(result.amounts.realizedSpend).toBe('1000.00');
      expect(result.amounts.remainingBudget).toBe('0.00');
    });

    it('evaluates warning when realized spend < 80% but planned commitments > 100%', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('1200.00'),
            actual: parseAccountingDecimal('300.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('300.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('warning');
      expect(result.amounts.realizedSpend).toBe('300.00');
      expect(result.amounts.plannedCommitments).toBe('1200.00');
    });
  });

  describe('Critical Threshold (> 100%)', () => {
    it('evaluates critical when realized spend is 100.01', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('1000.01'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('1000.01'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('critical');
      expect(result.amounts.realizedSpend).toBe('1000.01');
      expect(result.amounts.remainingBudget).toBe('-0.01');
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({ code: 'REDUCE_DAILY_SPENDING', impactLevel: 'high' })
      );
    });
  });

  describe('Zero Budget ($0.00)', () => {
    it('evaluates warning when budget is 0.00 and realized spend is 0.00', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('0.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('0.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('0.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('warning');
      expect(result.amounts.remainingBudget).toBe('0.00');
    });

    it('evaluates critical when budget is 0.00 and realized spend > 0', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('0.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('1.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('1.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('critical');
      expect(result.amounts.remainingBudget).toBe('-1.00');
    });
  });

  describe('Defect 1: Incomplete Data Must Emit Unavailable (Never Healthy/Warning/Critical)', () => {
    it('1. missing FX cannot return healthy', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'EUR',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('50.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('50.00'),
          },
        ],
        fxResults: [], // No FX quote for EUR
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('unavailable');
      expect(result.completeness).toBe('incomplete');
      expect(result.incompleteReasons).toContain('missing_fx_quote');
      expect(result.suggestions).toEqual([]);
    });

    it('2. unavailable FX cannot return healthy/warning/critical', () => {
      const unavailQuote: FxResult = {
        sourceCurrency: 'EUR',
        destinationCurrency: 'USD',
        state: 'unavailable',
        reason: 'network',
        quote: null,
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'EUR',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('900.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('900.00'),
          },
        ],
        fxResults: [unavailQuote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('unavailable');
      expect(result.completeness).toBe('incomplete');
      expect(result.incompleteReasons).toContain('fx_unavailable');
      expect(result.suggestions).toEqual([]);
    });

    it('3. unsupported currency cannot return normal risk', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'XYZ',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('10.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('10.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('unavailable');
      expect(result.completeness).toBe('incomplete');
      expect(result.incompleteReasons).toContain('unsupported_currency');
      expect(result.suggestions).toEqual([]);
    });

    it('4. currency pagination incomplete cannot return normal risk', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('100.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('100.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
        paginationIncomplete: true,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('unavailable');
      expect(result.completeness).toBe('incomplete');
      expect(result.incompleteReasons).toContain('pagination_limit_exceeded');
      expect(result.suggestions).toEqual([]);
    });

    it('5. incomplete result emits no confident suggestions (no MAINTAIN_CURRENT_PACE)', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('10.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('10.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
        paginationIncomplete: true,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('unavailable');
      expect(result.suggestions).toEqual([]);
    });

    it('6. stale-but-valid FX may still return deterministic risk with stale_fx completeness', () => {
      const staleQuote: FxResult = {
        sourceCurrency: 'EUR',
        destinationCurrency: 'USD',
        state: 'stale',
        reason: null,
        quote: {
          sourceCurrency: 'EUR',
          destinationCurrency: 'USD',
          rate: '1.100000000000000000',
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - 5 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - 5 * 24 * 60 * 60 * 1000).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'EUR',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('500.00'), // 550 USD (55%)
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('500.00'),
          },
        ],
        fxResults: [staleQuote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('healthy');
      expect(result.completeness).toBe('stale_fx');
      expect(result.amounts.realizedSpend).toBe('550.00');
    });
  });

  describe('Defect 2 & Defect 3: Suggestion Eligibility & Unreconciled Dimensions', () => {
    it('category aggregate alone never produces REVIEW_OPTIONAL_PAID_ACTIVITY without explicit eligibility', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('300.00'),
            actual: parseAccountingDecimal('850.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('850.00'),
          },
        ],
        categoryAggregates: [
          {
            category: 'activity',
            currency: 'USD',
            planned: parseAccountingDecimal('300.00'),
            actual: parseAccountingDecimal('0.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('0.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
        optionalPaidActivityReviewEligible: false,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('warning');
      expect(result.suggestions.some(s => s.code === 'REVIEW_OPTIONAL_PAID_ACTIVITY')).toBe(false);
      expect(result.suggestions.some(s => s.code === 'LOOK_FOR_FREE_ALTERNATIVE')).toBe(false);
    });

    it('emits REVIEW_OPTIONAL_PAID_ACTIVITY only when optionalPaidActivityReviewEligible is true', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('300.00'),
            actual: parseAccountingDecimal('850.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('850.00'),
          },
        ],
        categoryAggregates: [
          {
            category: 'activity',
            currency: 'USD',
            planned: parseAccountingDecimal('300.00'),
            actual: parseAccountingDecimal('0.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('0.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
        optionalPaidActivityReviewEligible: true,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('warning');
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({ code: 'REVIEW_OPTIONAL_PAID_ACTIVITY' }),
      );
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({ code: 'LOOK_FOR_FREE_ALTERNATIVE' }),
      );
    });

    it('Defect 3: planned 100 + actual 100 are kept independent and do not invent misleading projected 200', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('100.00'),
            actual: parseAccountingDecimal('100.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('100.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.amounts.realizedSpend).toBe('100.00');
      expect(result.amounts.plannedCommitments).toBe('100.00');
      expect(result.amounts.remainingBudget).toBe('900.00');
      // Verify totalProjectedSpend is absent from amounts contract
      expect((result.amounts as any).totalProjectedSpend).toBeUndefined();
    });
  });

  describe('Defect A: Exact Basis Points String Representation for Full Range', () => {
    it('1. 33.33% -> "3333"', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('333.33'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('333.33'),
          },
        ],
        categoryAggregates: [
          {
            category: 'food',
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('333.33'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('333.33'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.categoryBreakdown[0].fractionOfBudgetBasisPoints).toBe('3333');
    });

    it('2. 100% -> "10000"', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('1000.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('1000.00'),
          },
        ],
        categoryAggregates: [
          {
            category: 'food',
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('1000.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('1000.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.categoryBreakdown[0].fractionOfBudgetBasisPoints).toBe('10000');
    });

    it('3. 200% -> "20000" (exceeds 10000 when over budget, no clamp)', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('1000.00', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('2000.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('2000.00'),
          },
        ],
        categoryAggregates: [
          {
            category: 'food',
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('2000.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('2000.00'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.categoryBreakdown[0].fractionOfBudgetBasisPoints).toBe('20000');
    });

    it('4. very small budget + large category aggregate produces basis points > Number.MAX_SAFE_INTEGER exactly', () => {
      // Budget = $0.01 (1 cent). Spend = 10^16 cents = $100,000,000,000,000.00
      // Basis points = (10^16 * 10^4) / 1 = 10^20
      // Number.MAX_SAFE_INTEGER is 9,007,199,254,740,991 (~9 * 10^15). 10^20 exceeds it by >10,000x!
      const largeSpendDecimal = '100000000000000.00' as any; // 10^16 cents
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('0.01', 'USD'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal(largeSpendDecimal),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal(largeSpendDecimal),
          },
        ],
        categoryAggregates: [
          {
            category: 'food',
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal(largeSpendDecimal),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal(largeSpendDecimal),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      const bp = result.categoryBreakdown[0].fractionOfBudgetBasisPoints;
      expect(bp).toBe('100000000000000000000'); // Exactly 10^20
      expect(bp).not.toMatch(/[eE]/); // No scientific notation
      expect(BigInt(bp) > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    });
  });

  describe('Defect B: Accounting FX Conversion vs Display Rounding', () => {
    // 1 USD = 25450.50 VND (rate has fractional cents)
    const usdVndRate = '25450.500000000000000000';
    const makeUsdVndQuote = (state: 'fresh' | 'stale' = 'fresh'): FxResult => {
      const ageMs = state === 'stale' ? 5 * 24 * 60 * 60 * 1000 : 1000;
      return {
        sourceCurrency: 'USD',
        destinationCurrency: 'VND',
        state,
        reason: null,
        quote: {
          sourceCurrency: 'USD',
          destinationCurrency: 'VND',
          rate: usdVndRate,
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - ageMs).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - ageMs).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      };
    };

    it('USD -> VND conversion preserves exact non-zero accounting cents', () => {
      // 1.01 USD * 25450.50 = 25705.005 -> rounds half-up to 25705.01 VND
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('100000.00', 'VND'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('1.01'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('1.01'),
          },
        ],
        fxResults: [makeUsdVndQuote()],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.amounts.realizedSpend).toBe('25705.01');
      expect(result.riskLevel).toBe('healthy');
    });

    it('USD -> JPY conversion preserves exact non-zero accounting cents (1 USD = 155.45 JPY)', () => {
      // 1 USD = 155.455 JPY. 10.00 USD * 155.455 = 1554.55 JPY
      const usdJpyQuote: FxResult = {
        sourceCurrency: 'USD',
        destinationCurrency: 'JPY',
        state: 'fresh',
        reason: null,
        quote: {
          sourceCurrency: 'USD',
          destinationCurrency: 'JPY',
          rate: '155.455000000000000000',
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - 500).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('2000.00', 'JPY'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('10.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('10.00'),
          },
        ],
        fxResults: [usdJpyQuote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.amounts.realizedSpend).toBe('1554.55');
    });

    it('USD -> KRW conversion preserves exact non-zero accounting cents (1 USD = 1350.25 KRW)', () => {
      const usdKrwQuote: FxResult = {
        sourceCurrency: 'USD',
        destinationCurrency: 'KRW',
        state: 'fresh',
        reason: null,
        quote: {
          sourceCurrency: 'USD',
          destinationCurrency: 'KRW',
          rate: '1350.250000000000000000',
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - 500).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('100000.00', 'KRW'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('10.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('10.00'),
          },
        ],
        fxResults: [usdKrwQuote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.amounts.realizedSpend).toBe('13502.50');
    });

    it('1. foreign->VND exact result just BELOW 80% stays healthy', () => {
      // Budget = 100,000.00 VND. 80% threshold = 80,000.00 VND.
      // Rate = 20,000.00. Spend = 3.9999 USD -> let rate = 20000.000000000000000000
      // 3.99 USD * 20000 = 79,800.00 VND (< 80,000.00)
      const quote: FxResult = {
        sourceCurrency: 'USD',
        destinationCurrency: 'VND',
        state: 'fresh',
        reason: null,
        quote: {
          sourceCurrency: 'USD',
          destinationCurrency: 'VND',
          rate: '20000.000000000000000000',
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - 500).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('100000.00', 'VND'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('3.99'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('3.99'),
          },
        ],
        fxResults: [quote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.amounts.realizedSpend).toBe('79800.00');
      expect(result.riskLevel).toBe('healthy');
    });

    it('2. foreign->VND exact result exactly 80% is warning', () => {
      // Budget = 100,000.00 VND. 80% = 80,000.00 VND.
      // 4.00 USD * 20000 = 80,000.00 VND
      const quote: FxResult = {
        sourceCurrency: 'USD',
        destinationCurrency: 'VND',
        state: 'fresh',
        reason: null,
        quote: {
          sourceCurrency: 'USD',
          destinationCurrency: 'VND',
          rate: '20000.000000000000000000',
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - 500).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('100000.00', 'VND'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('4.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('4.00'),
          },
        ],
        fxResults: [quote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.amounts.realizedSpend).toBe('80000.00');
      expect(result.riskLevel).toBe('warning');
    });

    it('3. foreign->JPY exact result exactly budget is warning, not critical', () => {
      // Budget = 15000.00 JPY. Rate = 150.00 JPY per USD.
      // 100.00 USD * 150.00 = 15000.00 JPY
      const quote: FxResult = {
        sourceCurrency: 'USD',
        destinationCurrency: 'JPY',
        state: 'fresh',
        reason: null,
        quote: {
          sourceCurrency: 'USD',
          destinationCurrency: 'JPY',
          rate: '150.000000000000000000',
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - 500).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('15000.00', 'JPY'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('100.00'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('100.00'),
          },
        ],
        fxResults: [quote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.amounts.realizedSpend).toBe('15000.00');
      expect(result.amounts.remainingBudget).toBe('0.00');
      expect(result.riskLevel).toBe('warning');
    });

    it('4. foreign->JPY result one cent over budget is critical', () => {
      // Budget = 15000.00 JPY. Rate = 150.00 JPY per USD.
      // 100.01 USD * 150.00 = 15001.50 JPY (> 15000.00)
      const quote: FxResult = {
        sourceCurrency: 'USD',
        destinationCurrency: 'JPY',
        state: 'fresh',
        reason: null,
        quote: {
          sourceCurrency: 'USD',
          destinationCurrency: 'JPY',
          rate: '150.000000000000000000',
          provider: 'exchangerate-api-open',
          quotedAt: new Date(FIXED_NOW - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
          fetchedAt: new Date(FIXED_NOW - 500).toISOString(),
          timestampPrecision: 'second',
          sourceId: 'exchangerate-api-composite-usd',
          rateBasis: 'usd-cross-half-up-18dp',
          attribution: 'Rates By Exchange Rate API',
        },
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('15000.00', 'JPY'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('100.01'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('100.01'),
          },
        ],
        fxResults: [quote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.amounts.realizedSpend).toBe('15001.50');
      expect(result.amounts.remainingBudget).toBe('-1.50');
      expect(result.riskLevel).toBe('critical');
    });

    it('5. stale FX uses same exact accounting conversion', () => {
      const staleQuote = makeUsdVndQuote('stale');
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('100000.00', 'VND'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('1.01'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('1.01'),
          },
        ],
        fxResults: [staleQuote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.completeness).toBe('stale_fx');
      expect(result.amounts.realizedSpend).toBe('25705.01');
      expect(result.riskLevel).toBe('healthy');
    });

    it('6. unavailable FX remains unavailable', () => {
      const unavailQuote: FxResult = {
        sourceCurrency: 'USD',
        destinationCurrency: 'VND',
        state: 'unavailable',
        reason: 'network',
        quote: null,
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('100000.00', 'VND'),
        currencyAggregates: [
          {
            currency: 'USD',
            planned: parseAccountingDecimal('0.00'),
            actual: parseAccountingDecimal('1.01'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('1.01'),
          },
        ],
        fxResults: [unavailQuote],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.completeness).toBe('incomplete');
      expect(result.riskLevel).toBe('unavailable');
      expect(result.suggestions).toEqual([]);
    });

    it('7. same-currency VND/JPY/KRW 2-decimal values remain unchanged', () => {
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: createTripFxContext('25000000.00', 'VND'),
        currencyAggregates: [
          {
            currency: 'VND',
            planned: parseAccountingDecimal('5000000.50'),
            actual: parseAccountingDecimal('15000000.75'),
            unplanned: parseAccountingDecimal('0.00'),
            actualPlusUnplanned: parseAccountingDecimal('15000000.75'),
          },
        ],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      const result = evaluateBudgetRisk(input);
      expect(result.riskLevel).toBe('healthy');
      expect(result.amounts.totalBudget).toBe('25000000.00');
      expect(result.amounts.realizedSpend).toBe('15000000.75');
      expect(result.amounts.plannedCommitments).toBe('5000000.50');
      expect(result.amounts.remainingBudget).toBe('9999999.25');
    });
  });

  describe('Input Immutability & Original Object Safety', () => {
    it('does not mutate original input objects or original budget', () => {
      const originalContext = createTripFxContext('1000.00', 'USD');
      const frozenContext = JSON.parse(JSON.stringify(originalContext));
      const agg = {
        currency: 'USD',
        planned: parseAccountingDecimal('100.00'),
        actual: parseAccountingDecimal('200.00'),
        unplanned: parseAccountingDecimal('0.00'),
        actualPlusUnplanned: parseAccountingDecimal('200.00'),
      };
      const input: BudgetRiskEvaluationInput = {
        tripId: VALID_TRIP_ID,
        tripFxContext: originalContext,
        currencyAggregates: [agg],
        fxResults: [],
        evaluatedAtMs: FIXED_NOW,
      };
      evaluateBudgetRisk(input);
      expect(originalContext).toEqual(frozenContext);
      expect(originalContext.originalBudget.amount).toBe('1000.00');
    });
  });
});
