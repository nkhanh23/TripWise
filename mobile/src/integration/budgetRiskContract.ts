import type { TripId } from './contracts';
import { ContractValidationError } from './validation';
import { accountingMinorUnits, type AccountingDecimal } from './expenseAggregate';
import { convertFx, fxCurrency, parseFxRate, supportsFx, type FxConversion, type FxResult, type TripFxContext } from './fxContract';

export type BudgetRiskLevel = 'healthy' | 'warning' | 'critical' | 'not_configured' | 'unavailable';

export type BudgetRiskCompleteness = 'complete' | 'stale_fx' | 'incomplete';

export type BudgetRiskIncompleteReason =
  | 'missing_fx_quote'
  | 'unsupported_currency'
  | 'fx_unavailable'
  | 'no_budget_configured'
  | 'pagination_limit_exceeded';

export type SafeSuggestionCode =
  | 'REVIEW_FOOD_SPEND'
  | 'LOOK_FOR_FREE_ALTERNATIVE'
  | 'REVIEW_OPTIONAL_PAID_ACTIVITY'
  | 'REDUCE_DAILY_SPENDING'
  | 'MAINTAIN_CURRENT_PACE';

export type SafeSuggestion = {
  code: SafeSuggestionCode;
  category?: 'food' | 'activity' | 'general';
  impactLevel: 'low' | 'medium' | 'high';
};

export type BudgetRiskAmounts = {
  totalBudget: string | null;
  budgetCurrency: string | null;
  realizedSpend: string | null;
  plannedCommitments: string | null;
  remainingBudget: string | null;
  currencyFractionDigits: number | null;
};

export type CategorySpendBreakdown = {
  category: string;
  realizedSpend: string;
  plannedCommitments: string;
  fractionOfBudgetBasisPoints: string;
};

export type BudgetRiskResult = {
  tripId: TripId;
  riskLevel: BudgetRiskLevel;
  completeness: BudgetRiskCompleteness;
  incompleteReasons: BudgetRiskIncompleteReason[];
  policyVersion: 'TRIPWISE_BUDGET_RISK_V1';
  evaluatedAt: string;
  amounts: BudgetRiskAmounts;
  categoryBreakdown: CategorySpendBreakdown[];
  suggestions: SafeSuggestion[];
  fxConversionsApplied: FxConversion[];
};

export type CurrencyAggregateInput = {
  currency: string;
  planned: AccountingDecimal;
  actual: AccountingDecimal;
  unplanned: AccountingDecimal;
  actualPlusUnplanned: AccountingDecimal;
};

export type CategoryAggregateInput = {
  category: string;
  currency: string;
  planned: AccountingDecimal;
  actual: AccountingDecimal;
  unplanned: AccountingDecimal;
  actualPlusUnplanned: AccountingDecimal;
};

export type BudgetRiskEvaluationInput = {
  tripId: TripId;
  tripFxContext: TripFxContext;
  currencyAggregates: CurrencyAggregateInput[];
  categoryAggregates?: CategoryAggregateInput[];
  fxResults: FxResult[];
  evaluatedAtMs?: number;
  paginationIncomplete?: boolean;
  categoryPaginationIncomplete?: boolean;
  optionalPaidActivityReviewEligible?: boolean;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (): never => { throw new ContractValidationError('budget risk contract'); };

function formatMinorUnits(units: bigint, fractionDigits: number): string {
  const negative = units < BigInt(0);
  const abs = negative ? -units : units;
  const raw = abs.toString().padStart(fractionDigits + 1, '0');
  const sign = negative ? '-' : '';
  if (fractionDigits === 0) return `${sign}${raw}`;
  return `${sign}${raw.slice(0, -fractionDigits)}.${raw.slice(-fractionDigits)}`;
}

/**
 * T004-specific exact accounting conversion:
 * Converts 2-decimal source amount to 2-decimal destination accounting minor units (cents)
 * via direct BigInt arithmetic rounded HALF-UP to 2 decimal places.
 * Does NOT round through 0-decimal display conventions (e.g. VND/JPY/KRW).
 */
export function convertToAccountingCents(
  sourceAmountDecimal: AccountingDecimal,
  rateString: string,
): bigint {
  const rate = parseFxRate(rateString);
  const rateScale = rate.split('.')[1]?.length ?? 0;
  const rateInt = BigInt(rate.replace('.', ''));

  const negative = sourceAmountDecimal.startsWith('-');
  const absSource = BigInt(sourceAmountDecimal.replace('-', '').replace('.', ''));

  // sourceAmount has 2 decimal digits: value = absSource / 100
  // rate has rateScale decimal digits: value = rateInt / 10^rateScale
  // We want result in 2 decimal digits (cents): result = roundHalfUp((absSource * rateInt) / 10^rateScale)
  const numerator = absSource * rateInt;
  const denominator = BigInt(10) ** BigInt(rateScale);

  if (denominator === BigInt(0)) fail();

  // Half-up rounding: (numerator * 2 + denominator) / (denominator * 2)
  const rounded = (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
  return negative ? -rounded : rounded;
}

export function evaluateBudgetRisk(input: BudgetRiskEvaluationInput): BudgetRiskResult {
  if (!input || typeof input !== 'object') fail();
  if (typeof input.tripId !== 'string' || !uuidRegex.test(input.tripId)) fail();
  const tripId = input.tripId.toLowerCase() as TripId;

  const nowMs = input.evaluatedAtMs ?? Date.now();
  if (!Number.isFinite(nowMs)) fail();
  const evaluatedAt = new Date(nowMs).toISOString();

  const { originalBudget } = input.tripFxContext;
  const budgetCurrency = originalBudget.currency;
  const rawBudgetAmount = originalBudget.amount;

  // Case 1: Budget not configured (null amount or null currency)
  if (!budgetCurrency || rawBudgetAmount === null || rawBudgetAmount === undefined) {
    return {
      tripId,
      riskLevel: 'not_configured',
      completeness: 'incomplete',
      incompleteReasons: ['no_budget_configured'],
      policyVersion: 'TRIPWISE_BUDGET_RISK_V1',
      evaluatedAt,
      amounts: {
        totalBudget: null,
        budgetCurrency: null,
        realizedSpend: null,
        plannedCommitments: null,
        remainingBudget: null,
        currencyFractionDigits: null,
      },
      categoryBreakdown: [],
      suggestions: [],
      fxConversionsApplied: [],
    };
  }

  if (!fxCurrency(budgetCurrency) || !supportsFx(budgetCurrency)) {
    fail();
  }

  const budgetFractionDigits = 2;

  const parseBudgetMinor = (): bigint => {
    try {
      const parts = rawBudgetAmount.split('.');
      const intPart = parts[0];
      const decPart = (parts[1] || '').padEnd(2, '0').slice(0, 2);
      return BigInt(intPart) * BigInt(100) + BigInt(decPart);
    } catch {
      return fail();
    }
  };
  const budgetMinor = parseBudgetMinor();

  if (budgetMinor < BigInt(0)) fail();

  const incompleteReasons: BudgetRiskIncompleteReason[] = [];
  let completeness: BudgetRiskCompleteness = 'complete';

  if (input.paginationIncomplete) {
    incompleteReasons.push('pagination_limit_exceeded');
    completeness = 'incomplete';
  }

  if (input.categoryPaginationIncomplete) {
    incompleteReasons.push('pagination_limit_exceeded');
    completeness = 'incomplete';
  }

  const fxResultsMap = new Map<string, FxResult>();
  for (const r of input.fxResults) {
    if (r.destinationCurrency === budgetCurrency) {
      fxResultsMap.set(r.sourceCurrency, r);
    }
  }

  let totalRealizedMinor = BigInt(0);
  let totalPlannedMinor = BigInt(0);
  const fxConversionsApplied: FxConversion[] = [];

  for (const agg of input.currencyAggregates) {
    const srcCurrency = agg.currency;
    if (!fxCurrency(srcCurrency) || !supportsFx(srcCurrency)) {
      incompleteReasons.push('unsupported_currency');
      completeness = 'incomplete';
      continue;
    }

    if (srcCurrency === budgetCurrency) {
      const realizedUnits = accountingMinorUnits(agg.actualPlusUnplanned);
      const plannedUnits = accountingMinorUnits(agg.planned);
      totalRealizedMinor += realizedUnits;
      totalPlannedMinor += plannedUnits;
    } else {
      const fxResult = fxResultsMap.get(srcCurrency);
      if (!fxResult || fxResult.state === 'unavailable') {
        incompleteReasons.push(fxResult ? 'fx_unavailable' : 'missing_fx_quote');
        completeness = 'incomplete';
        continue;
      }

      if (fxResult.state === 'stale' && completeness !== 'incomplete') {
        completeness = 'stale_fx';
      }

      // 1. T003 conversion for display/provenance trace
      const realizedConv = convertFx(agg.actualPlusUnplanned, srcCurrency, fxResult, nowMs);
      const plannedConv = convertFx(agg.planned, srcCurrency, fxResult, nowMs);
      fxConversionsApplied.push(realizedConv, plannedConv);

      // 2. T004 exact 2-decimal accounting conversion for risk calculation
      if (fxResult.quote?.rate) {
        const realizedCents = convertToAccountingCents(agg.actualPlusUnplanned, fxResult.quote.rate);
        const plannedCents = convertToAccountingCents(agg.planned, fxResult.quote.rate);
        totalRealizedMinor += realizedCents;
        totalPlannedMinor += plannedCents;
      } else {
        incompleteReasons.push('fx_unavailable');
        completeness = 'incomplete';
      }
    }
  }

  const uniqueIncompleteReasons = [...new Set(incompleteReasons)];
  const remainingMinor = budgetMinor - totalRealizedMinor;

  let riskLevel: BudgetRiskLevel;

  // Defect 1: Incomplete data MUST NOT emit confident risk (healthy/warning/critical)
  if (completeness === 'incomplete') {
    riskLevel = 'unavailable';
  } else if (budgetMinor === BigInt(0)) {
    if (totalRealizedMinor > BigInt(0)) {
      riskLevel = 'critical';
    } else {
      riskLevel = 'warning';
    }
  } else {
    // 80% threshold: totalRealizedMinor * 10 >= budgetMinor * 8
    // 100% threshold: totalRealizedMinor > budgetMinor
    if (totalRealizedMinor > budgetMinor) {
      riskLevel = 'critical';
    } else if (totalRealizedMinor * BigInt(10) >= budgetMinor * BigInt(8)) {
      riskLevel = 'warning';
    } else if (totalPlannedMinor > budgetMinor) {
      riskLevel = 'warning';
    } else {
      riskLevel = 'healthy';
    }
  }

  const categoryBreakdown: CategorySpendBreakdown[] = [];
  const categoryInputs = input.categoryAggregates ?? [];
  const categorySpendMap = new Map<string, { realized: bigint; planned: bigint }>();

  for (const catAgg of categoryInputs) {
    const srcCurrency = catAgg.currency;
    if (!fxCurrency(srcCurrency) || !supportsFx(srcCurrency)) continue;

    let rUnits = BigInt(0);
    let pUnits = BigInt(0);

    if (srcCurrency === budgetCurrency) {
      rUnits = accountingMinorUnits(catAgg.actualPlusUnplanned);
      pUnits = accountingMinorUnits(catAgg.planned);
    } else {
      const fxResult = fxResultsMap.get(srcCurrency);
      if (fxResult && fxResult.state !== 'unavailable' && fxResult.quote?.rate) {
        rUnits = convertToAccountingCents(catAgg.actualPlusUnplanned, fxResult.quote.rate);
        pUnits = convertToAccountingCents(catAgg.planned, fxResult.quote.rate);
      }
    }

    const current = categorySpendMap.get(catAgg.category) ?? { realized: BigInt(0), planned: BigInt(0) };
    current.realized += rUnits;
    current.planned += pUnits;
    categorySpendMap.set(catAgg.category, current);
  }

  for (const [catName, spend] of categorySpendMap.entries()) {
    // Defect A: Exact base-10 integer string representation for basis points
    // Represents floor((realized / budget) * 10000)
    // May exceed 10000 when over budget; may exceed Number.MAX_SAFE_INTEGER without losing precision
    let basisPointsStr = '0';
    if (budgetMinor > BigInt(0) && spend.realized > BigInt(0)) {
      const bpBigInt = (spend.realized * BigInt(10000)) / budgetMinor;
      basisPointsStr = bpBigInt.toString();
    }
    categoryBreakdown.push({
      category: catName,
      realizedSpend: formatMinorUnits(spend.realized, budgetFractionDigits),
      plannedCommitments: formatMinorUnits(spend.planned, budgetFractionDigits),
      fractionOfBudgetBasisPoints: basisPointsStr,
    });
  }

  const suggestions: SafeSuggestion[] = [];

  // Suggestion safety: only emit suggestions when risk calculation is complete (healthy, warning, or critical)
  if (riskLevel === 'warning' || riskLevel === 'critical') {
    // Only emit category-based suggestions if category pagination is complete
    if (!input.categoryPaginationIncomplete) {
      const foodSpend = categorySpendMap.get('food');
      if (foodSpend && budgetMinor > BigInt(0)) {
        if (foodSpend.realized * BigInt(100) >= budgetMinor * BigInt(30)) {
          suggestions.push({
            code: 'REVIEW_FOOD_SPEND',
            category: 'food',
            impactLevel: 'medium',
          });
        }
      }

      // Defect 2: Only emit REVIEW_OPTIONAL_PAID_ACTIVITY if positive trusted proof exists
      if (input.optionalPaidActivityReviewEligible === true) {
        const activitySpend = categorySpendMap.get('activity');
        if (activitySpend && activitySpend.planned > BigInt(0)) {
          suggestions.push({
            code: 'LOOK_FOR_FREE_ALTERNATIVE',
            category: 'activity',
            impactLevel: 'high',
          });
          suggestions.push({
            code: 'REVIEW_OPTIONAL_PAID_ACTIVITY',
            category: 'activity',
            impactLevel: 'medium',
          });
        }
      }
    }

    suggestions.push({
      code: 'REDUCE_DAILY_SPENDING',
      category: 'general',
      impactLevel: riskLevel === 'critical' ? 'high' : 'medium',
    });
  } else if (riskLevel === 'healthy') {
    suggestions.push({
      code: 'MAINTAIN_CURRENT_PACE',
      category: 'general',
      impactLevel: 'low',
    });
  }
  // When riskLevel === 'unavailable' or 'not_configured', suggestions array is intentionally empty.

  return {
    tripId,
    riskLevel,
    completeness,
    incompleteReasons: uniqueIncompleteReasons,
    policyVersion: 'TRIPWISE_BUDGET_RISK_V1',
    evaluatedAt,
    amounts: {
      totalBudget: formatMinorUnits(budgetMinor, budgetFractionDigits),
      budgetCurrency,
      realizedSpend: formatMinorUnits(totalRealizedMinor, budgetFractionDigits),
      plannedCommitments: formatMinorUnits(totalPlannedMinor, budgetFractionDigits),
      remainingBudget: formatMinorUnits(remainingMinor, budgetFractionDigits),
      currencyFractionDigits: budgetFractionDigits,
    },
    categoryBreakdown,
    suggestions,
    fxConversionsApplied,
  };
}
