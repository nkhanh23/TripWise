import {
  parseAccountingBudgetInput,
  isValidBudgetCurrency,
  CANONICAL_BUDGET_CURRENCIES,
  MAX_CONFIGURED_BUDGET,
} from '../src/features/planner/budgetValidation';

describe('parseAccountingBudgetInput', () => {
  it('allows empty or whitespace inputs as honest unconfigured budget (null)', () => {
    expect(parseAccountingBudgetInput('')).toEqual({ valid: true, value: null, errorKey: null });
    expect(parseAccountingBudgetInput('   ')).toEqual({ valid: true, value: null, errorKey: null });
  });

  it('validates canonical zero amounts correctly', () => {
    expect(parseAccountingBudgetInput('0')).toEqual({ valid: true, value: 0, errorKey: null });
    expect(parseAccountingBudgetInput('0.00')).toEqual({ valid: true, value: 0, errorKey: null });
  });

  it('validates standard integers and decimals up to 2 decimal places', () => {
    expect(parseAccountingBudgetInput('1000')).toEqual({ valid: true, value: 1000, errorKey: null });
    expect(parseAccountingBudgetInput('1000.5')).toEqual({ valid: true, value: 1000.5, errorKey: null });
    expect(parseAccountingBudgetInput('1000.50')).toEqual({ valid: true, value: 1000.5, errorKey: null });
    expect(parseAccountingBudgetInput('250.75')).toEqual({ valid: true, value: 250.75, errorKey: null });
  });

  it('validates maximum boundary 1,000,000,000', () => {
    expect(parseAccountingBudgetInput('1000000000')).toEqual({
      valid: true,
      value: 1000000000,
      errorKey: null,
    });
    expect(parseAccountingBudgetInput('1000000000.00')).toEqual({
      valid: true,
      value: 1000000000,
      errorKey: null,
    });
  });

  it('rejects trailing characters, non-numbers, and letters', () => {
    expect(parseAccountingBudgetInput('1000abc').valid).toBe(false);
    expect(parseAccountingBudgetInput('abc').valid).toBe(false);
    expect(parseAccountingBudgetInput('$1000').valid).toBe(false);
  });

  it('rejects exponent notation', () => {
    expect(parseAccountingBudgetInput('1e3').valid).toBe(false);
    expect(parseAccountingBudgetInput('1E3').valid).toBe(false);
    expect(parseAccountingBudgetInput('1.5e6').valid).toBe(false);
  });

  it('rejects negative amounts', () => {
    expect(parseAccountingBudgetInput('-1').valid).toBe(false);
    expect(parseAccountingBudgetInput('-0.01').valid).toBe(false);
  });

  it('rejects excessive precision (>2 decimal places) without silently rounding', () => {
    expect(parseAccountingBudgetInput('1000.123').valid).toBe(false);
    expect(parseAccountingBudgetInput('0.001').valid).toBe(false);
    expect(parseAccountingBudgetInput('99.999').valid).toBe(false);
  });

  it('rejects values exceeding maximum limit', () => {
    expect(parseAccountingBudgetInput('1000000000.01').valid).toBe(false);
    expect(parseAccountingBudgetInput('1000000001').valid).toBe(false);
    expect(parseAccountingBudgetInput('9999999999').valid).toBe(false);
  });
});

describe('isValidBudgetCurrency', () => {
  it('accepts all canonical supported currencies', () => {
    for (const cur of CANONICAL_BUDGET_CURRENCIES) {
      expect(isValidBudgetCurrency(cur)).toBe(true);
    }
  });

  it('rejects unsupported or malformed currencies', () => {
    expect(isValidBudgetCurrency('XYZ')).toBe(false);
    expect(isValidBudgetCurrency('usd')).toBe(false);
    expect(isValidBudgetCurrency('')).toBe(false);
    expect(isValidBudgetCurrency('US')).toBe(false);
  });
});
