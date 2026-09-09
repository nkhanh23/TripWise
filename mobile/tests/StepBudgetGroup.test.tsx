import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { StepBudgetGroup } from '../src/features/planner/components/StepBudgetGroup';
import { CANONICAL_BUDGET_CURRENCIES } from '../src/features/planner/budgetValidation';
import { ThemeProvider } from '../src/theme';
import { darkPalette, lightPalette } from '../src/theme/palettes';
import { TranslationProvider } from '../src/i18n';
import { enTranslations } from '../src/i18n/en';
import { viTranslations } from '../src/i18n/vi';

afterEach(() => { cleanup(); jest.restoreAllMocks(); });

describe.each(['en', 'vi'] as const)('accounting controls %s', (locale) => {
  it.each(['light', 'dark', 'system-light', 'system-dark'] as const)('%s uses semantic colors and localized accessible controls', async (mode) => {
    const dark = mode.endsWith('dark');
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(dark ? 'dark' : 'light');
    const palette = dark ? darkPalette : lightPalette;
    const dictionary = locale === 'vi' ? viTranslations : enTranslations;
    const selectCurrency = jest.fn();
    const changeAmount = jest.fn();
    const error = dictionary['planner.validation.budgetCurrencyInvalid'];
    await render(
      <ThemeProvider initialPreference={mode.startsWith('system') ? 'system' : dark ? 'dark' : 'light'}>
        <TranslationProvider initialLocale={locale}>
          <StepBudgetGroup selectedBudget="moderate" selectedGroup="couple" budgetAmount="1000.50" budgetCurrency="USD"
            budgetError={error} onSelectBudget={jest.fn()} onSelectGroup={jest.fn()}
            onChangeBudgetAmount={changeAmount} onSelectBudgetCurrency={selectCurrency} />
        </TranslationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('accounting-budget')).toHaveStyle({ backgroundColor: palette.background.surface, borderColor: palette.border.default });
    const input = screen.getByLabelText(dictionary['planner.budget.amountLabel']);
    expect(input).toHaveStyle({ color: palette.text.primary, minHeight: 44 });
    expect(input.props.placeholderTextColor).toBe(palette.text.muted);
    expect(input.props.accessibilityHint).toBe(dictionary['planner.budget.amountHint']);
    expect(screen.getByRole('alert')).toHaveStyle({ color: palette.state.error });
    expect(screen.getByRole('alert').props.accessibilityLiveRegion).toBe('polite');
    for (const currency of CANONICAL_BUDGET_CURRENCIES) {
      const label = dictionary['planner.budget.currencyOptionLabel'].replace('{currency}', currency);
      const button = screen.getByRole('button', { name: label });
      expect(button.props.accessibilityHint).toBe(dictionary['planner.budget.currencyOptionHint'].replace('{currency}', currency));
      expect(button.props.accessibilityState.selected).toBe(currency === 'USD');
      expect(button).toHaveStyle({ minHeight: 44, minWidth: 54, backgroundColor: currency === 'USD' ? palette.brand.primary : palette.background.surfaceVariant });
    }
    await fireEvent.press(screen.getByLabelText(dictionary['planner.budget.currencyOptionLabel'].replace('{currency}', 'JPY')));
    expect(selectCurrency).toHaveBeenCalledWith('JPY');
    await fireEvent.changeText(input, '2000.50');
    expect(changeAmount).toHaveBeenCalledWith('2000.50');
  });
});
