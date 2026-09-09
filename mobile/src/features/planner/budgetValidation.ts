import { supportsFx } from '../../integration/fxContract';

export const CANONICAL_BUDGET_CURRENCIES = [
  'USD',
  'VND',
  'THB',
  'JPY',
  'EUR',
  'GBP',
  'SGD',
  'KRW',
] as const;

export type CanonicalBudgetCurrency = (typeof CANONICAL_BUDGET_CURRENCIES)[number];

export const MAX_CONFIGURED_BUDGET = 1_000_000_000;

export type BudgetValidationResult =
  | { valid: true; value: number | null; errorKey: null }
  | { valid: false; value: null; errorKey: string };

const EXACT_BUDGET_PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

/**
 * Validates user-entered accounting budget string with fail-closed semantics.
 * - Empty string or whitespace: valid (unconfigured budget => null).
 * - Non-empty string: strictly matches decimal format with max 2 decimal places,
 *   finite number, >= 0, and <= 1,000,000,000.
 */
export function parseAccountingBudgetInput(raw: string): BudgetValidationResult {
  if (typeof raw !== 'string') {
    return { valid: false, value: null, errorKey: 'planner.validation.budgetFormatInvalid' };
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { valid: true, value: null, errorKey: null };
  }

  if (!EXACT_BUDGET_PATTERN.test(trimmed)) {
    return { valid: false, value: null, errorKey: 'planner.validation.budgetFormatInvalid' };
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { valid: false, value: null, errorKey: 'planner.validation.budgetNegative' };
  }

  if (numeric > MAX_CONFIGURED_BUDGET) {
    return { valid: false, value: null, errorKey: 'planner.validation.budgetExceedsMax' };
  }

  return { valid: true, value: numeric, errorKey: null };
}

export function isValidBudgetCurrency(currency: unknown): currency is CanonicalBudgetCurrency {
  return typeof currency === 'string'
    && (CANONICAL_BUDGET_CURRENCIES as readonly string[]).includes(currency) && supportsFx(currency);
}

/** Validate the pair without normalizing or inventing a configured currency. */
export function validateAccountingBudget(raw: string | undefined, currency: unknown): BudgetValidationResult {
  const amount = parseAccountingBudgetInput(raw === undefined ? '' : raw);
  if (!amount.valid || amount.value === null) return amount;
  return isValidBudgetCurrency(currency)
    ? amount
    : { valid: false, value: null, errorKey: 'planner.validation.budgetCurrencyInvalid' };
}
