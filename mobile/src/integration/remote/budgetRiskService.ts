import type { TripId } from '../contracts';
import { IntegrationError } from '../errors';
import type { ExpenseAggregateRow, TripExpenseAggregateRepository } from '../expenseAggregate';
import type { FxPair, FxRateRepository, FxResult, TripFxContextRepository } from '../fxContract';
import {
  evaluateBudgetRisk,
  type BudgetRiskEvaluationInput,
  type BudgetRiskResult,
  type CategoryAggregateInput,
  type CurrencyAggregateInput,
} from '../budgetRiskContract';

export interface BudgetRiskServiceRequest {
  tripId: TripId;
  includeCategoryBreakdown?: boolean;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BudgetRiskService {
  constructor(
    private readonly tripFxContextRepo: TripFxContextRepository,
    private readonly aggregateRepo: TripExpenseAggregateRepository,
    private readonly fxRepo: FxRateRepository,
    private readonly nowProvider: () => number = () => Date.now(),
  ) {}

  async evaluateTripBudgetRisk(
    request: BudgetRiskServiceRequest,
    signal?: AbortSignal,
  ): Promise<BudgetRiskResult> {
    if (signal?.aborted) throw new IntegrationError('cancelled');

    const { tripId, includeCategoryBreakdown } = request;
    if (typeof tripId !== 'string' || !uuidRegex.test(tripId)) {
      throw new IntegrationError('invalidRequest');
    }

    const now = this.nowProvider();

    // 1. Fetch Trip FX Context (Budget amount, currency)
    const tripFxContext = await this.tripFxContextRepo.getTripFxContext(tripId, signal);
    if (signal?.aborted) throw new IntegrationError('cancelled');

    const budgetCurrency = tripFxContext.originalBudget.currency;
    const budgetAmount = tripFxContext.originalBudget.amount;

    // Fast-path if budget not configured: return deterministic not_configured result
    if (!budgetCurrency || budgetAmount === null || budgetAmount === undefined) {
      return evaluateBudgetRisk({
        tripId,
        tripFxContext,
        currencyAggregates: [],
        categoryAggregates: [],
        fxResults: [],
        evaluatedAtMs: now,
      });
    }

    // 2. Fetch Currency Aggregates (max 8 supported currencies fit easily into page limit 50)
    const currencyPage = await this.aggregateRepo.getAggregate(
      { tripId, groupBy: 'currency', limit: 50 },
      signal,
    );
    if (signal?.aborted) throw new IntegrationError('cancelled');

    const paginationIncomplete = currencyPage.nextCursor !== null;

    const currencyAggregates: CurrencyAggregateInput[] = currencyPage.items.map(item => ({
      currency: item.currency,
      planned: item.planned,
      actual: item.actual,
      unplanned: item.unplanned,
      actualPlusUnplanned: item.actualPlusUnplanned,
    }));

    // 3. Optional: Fetch Category Aggregates with bounded 2-page pagination (max 72 items = 9 categories * 8 currencies)
    let categoryAggregates: CategoryAggregateInput[] = [];
    let categoryPaginationIncomplete = false;

    if (includeCategoryBreakdown) {
      const allCategoryItems: ExpenseAggregateRow[] = [];
      const seenKeys = new Set<string>();

      // Page 1
      const page1 = await this.aggregateRepo.getAggregate(
        { tripId, groupBy: 'category', limit: 50 },
        signal,
      );
      if (signal?.aborted) throw new IntegrationError('cancelled');

      for (const item of page1.items) {
        if (seenKeys.has(item.key)) {
          categoryPaginationIncomplete = true;
          break;
        }
        seenKeys.add(item.key);
        allCategoryItems.push(item);
      }

      // Page 2 if needed and Page 1 was valid
      if (!categoryPaginationIncomplete && page1.nextCursor !== null) {
        const page2 = await this.aggregateRepo.getAggregate(
          { tripId, groupBy: 'category', limit: 50, cursor: page1.nextCursor },
          signal,
        );
        if (signal?.aborted) throw new IntegrationError('cancelled');

        if (page2.nextCursor !== null) {
          // Bounded strategy: more than 2 pages is anomalous (>100 items when max theoretical is 72)
          categoryPaginationIncomplete = true;
        } else {
          for (const item of page2.items) {
            if (seenKeys.has(item.key) || item.key <= page1.nextCursor) {
              categoryPaginationIncomplete = true;
              break;
            }
            seenKeys.add(item.key);
            allCategoryItems.push(item);
          }
        }
      }

      if (!categoryPaginationIncomplete) {
        categoryAggregates = allCategoryItems.map(item => ({
          category: item.category ?? 'other',
          currency: item.currency,
          planned: item.planned,
          actual: item.actual,
          unplanned: item.unplanned,
          actualPlusUnplanned: item.actualPlusUnplanned,
        }));
      }
    }

    // 4. Identify foreign currencies and request FX quotes
    const foreignCurrencies = new Set<string>();
    for (const agg of currencyAggregates) {
      if (agg.currency !== budgetCurrency) {
        foreignCurrencies.add(agg.currency);
      }
    }
    for (const agg of categoryAggregates) {
      if (agg.currency !== budgetCurrency) {
        foreignCurrencies.add(agg.currency);
      }
    }

    let fxResults: FxResult[] = [];
    if (foreignCurrencies.size > 0) {
      const pairs: FxPair[] = Array.from(foreignCurrencies).map(sourceCurrency => ({
        sourceCurrency,
        destinationCurrency: budgetCurrency,
      }));

      fxResults = await this.fxRepo.getQuotes({ pairs }, signal);
      if (signal?.aborted) throw new IntegrationError('cancelled');
    }

    // 5. Evaluate budget risk
    const evaluationInput: BudgetRiskEvaluationInput = {
      tripId,
      tripFxContext,
      currencyAggregates,
      categoryAggregates,
      fxResults,
      evaluatedAtMs: now,
      paginationIncomplete,
      categoryPaginationIncomplete,
      optionalPaidActivityReviewEligible: false, // Category aggregate alone cannot prove optional activity
    };

    return evaluateBudgetRisk(evaluationInput);
  }
}
