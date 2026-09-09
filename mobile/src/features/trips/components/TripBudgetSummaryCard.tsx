import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  originalBudgetAmount: string | null;
  originalBudgetCurrency: string | null;
  realizedSpend: string | null;
  plannedCommitments: string | null;
  remainingBudget: string | null;
  accountingCurrency: string | null;
  currencyFractionDigits: number | null;
  displayCurrency: string;
  availableCurrencies: string[];
  onSelectDisplayCurrency: (currency: string) => void;
};

export const TripBudgetSummaryCard = memo(function TripBudgetSummaryCard({
  originalBudgetAmount,
  originalBudgetCurrency,
  realizedSpend,
  plannedCommitments,
  remainingBudget,
  accountingCurrency,
  currencyFractionDigits,
  displayCurrency,
  availableCurrencies,
  onSelectDisplayCurrency,
}: Props) {
  const { colors } = useTheme();
  const { t, formatCurrency } = useTranslation();

  const isConfigured = originalBudgetAmount !== null && originalBudgetCurrency !== null;
  const comparableAccountingAmounts =
    accountingCurrency !== null && accountingCurrency === originalBudgetCurrency;
  const percent = comparableAccountingAmounts
    ? calculateProgressPercent(originalBudgetAmount, realizedSpend, currencyFractionDigits)
    : null;
  const isOverBudget = comparableAccountingAmounts && remainingBudget?.startsWith('-') === true;

  return (
    <View
      accessibilityLabel={t('tripExpenses.budgetSummary')}
      style={[
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
          shadowColor: colors.overlay.scrim,
        },
      ]}>
      {/* Header with Title & Currency Selector */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <MaterialIcons color={colors.brand.primary} name="account-balance-wallet" size={20} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('tripExpenses.budgetSummary')}
          </Text>
        </View>

        {/* Currency Switcher Chips */}
        {availableCurrencies.length > 1 ? (
          <View style={styles.currencyChips}>
            {availableCurrencies.map((curr) => {
              const active = curr === displayCurrency;
              return (
                <Pressable
                  key={curr}
                  accessibilityLabel={`${t('tripExpenses.displayCurrency')}: ${curr}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  hitSlop={8}
                  onPress={() => onSelectDisplayCurrency(curr)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.brand.primary : colors.background.surfaceVariant,
                      borderColor: active ? colors.brand.primary : colors.border.default,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.text.inverse : colors.text.secondary },
                    ]}>
                    {curr}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Progress Track */}
      {isConfigured && percent !== null ? (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.background.surfaceVariant },
            ]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: isOverBudget ? colors.state.error : colors.brand.primary,
                  width: `${percent}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.percentLabel, { color: colors.text.muted }]}>
            {percent}%
          </Text>
        </View>
      ) : null}

      {/* Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        {/* 1. Original Budget */}
        <View style={[styles.metricItem, { borderRightColor: colors.border.subtle, borderRightWidth: 1 }]}>
          <Text style={[styles.metricLabel, { color: colors.text.muted }]}>
            {t('tripExpenses.originalBudget')}
          </Text>
          <Text style={[styles.metricValue, { color: colors.text.primary }]}>
            {isConfigured
              ? formatCurrency(originalBudgetAmount, originalBudgetCurrency)
              : t('tripExpenses.noBudgetConfigured')}
          </Text>
          <Text style={[styles.metricSub, { color: colors.text.muted }]}>
            {t('tripExpenses.originalCurrency')}
          </Text>
        </View>

        {/* 2. Realized Spend */}
        <View style={[styles.metricItem, { borderRightColor: colors.border.subtle, borderRightWidth: 1 }]}>
          <Text style={[styles.metricLabel, { color: colors.text.muted }]}>
            {t('tripExpenses.realizedSpend')}
          </Text>
          <Text
            style={[
              styles.metricValue,
              { color: isOverBudget ? colors.state.error : colors.text.primary },
            ]}>
            {realizedSpend && accountingCurrency
              ? formatCurrency(realizedSpend, accountingCurrency)
              : '—'}
          </Text>
          <Text style={[styles.metricSub, { color: colors.text.muted }]}>
            {t('tripExpenses.accountingValue')}
          </Text>
        </View>

        {/* 3. Remaining Budget */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.text.muted }]}>
            {t('tripExpenses.remainingBudget')}
          </Text>
          <Text
            style={[
              styles.metricValue,
              {
                color:
                  remainingBudget === null
                    ? colors.text.muted
                    : isOverBudget
                    ? colors.state.error
                    : colors.state.success,
              },
            ]}>
            {remainingBudget !== null && accountingCurrency
              ? formatCurrency(remainingBudget, accountingCurrency)
              : '—'}
          </Text>
          <Text style={[styles.metricSub, { color: colors.text.muted }]}>
            {t('tripExpenses.accountingValue')}
          </Text>
        </View>
      </View>

      {/* Planned Commitments Note */}
      {plannedCommitments && accountingCurrency ? (
        <View style={[styles.plannedRow, { borderTopColor: colors.border.subtle }]}>
          <MaterialIcons color={colors.text.muted} name="schedule" size={14} />
          <Text style={[styles.plannedText, { color: colors.text.secondary }]}>
            {t('tripExpenses.plannedCommitments')}: {formatCurrency(plannedCommitments, accountingCurrency)}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.displayPreference, { color: colors.text.muted }]}>
        {t('tripExpenses.displayCurrencyPreference')}: {displayCurrency}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleWithIcon: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  currencyChips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 30,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  progressContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    borderRadius: radius.pill,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  percentLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    width: 36,
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.4,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
  metricSub: {
    fontSize: 10,
    marginTop: 2,
  },
  plannedRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  plannedText: {
    fontSize: 11,
  },
  displayPreference: {
    fontSize: 11,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});

function calculateProgressPercent(
  budget: string | null,
  realized: string | null,
  fractionDigits: number | null
): number | null {
  if (budget === null || realized === null || (fractionDigits !== 0 && fractionDigits !== 2)) {
    return null;
  }
  const suffix = fractionDigits === 0 ? '' : `\\.\\d{${fractionDigits}}`;
  const pattern = new RegExp(`^\\d+${suffix}$`);
  if (!pattern.test(budget) || !pattern.test(realized)) return null;
  const budgetMinor = BigInt(budget.replace('.', ''));
  const realizedMinor = BigInt(realized.replace('.', ''));
  if (budgetMinor <= 0n) return null;
  const roundedPercent = (realizedMinor * 100n + budgetMinor / 2n) / budgetMinor;
  return Number(roundedPercent > 100n ? 100n : roundedPercent);
}
