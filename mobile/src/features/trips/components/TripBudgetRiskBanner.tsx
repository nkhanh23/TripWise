import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { BudgetRiskResult } from '../../../integration/budgetRiskContract';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  risk: BudgetRiskResult | null;
};

export const TripBudgetRiskBanner = memo(function TripBudgetRiskBanner({ risk }: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  if (!risk) return null;

  const { riskLevel, completeness, suggestions } = risk;

  const getRiskConfig = () => {
    switch (riskLevel) {
      case 'healthy':
        return {
          icon: 'check-circle' as const,
          label: t('tripExpenses.riskHealthy'),
          color: effectiveTheme === 'dark' ? '#81C784' : '#2E7D32',
          bgColor: effectiveTheme === 'dark' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(46, 125, 50, 0.08)',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          label: t('tripExpenses.riskWarning'),
          color: effectiveTheme === 'dark' ? '#FFB74D' : '#E65100',
          bgColor: effectiveTheme === 'dark' ? 'rgba(230, 81, 0, 0.2)' : 'rgba(230, 81, 0, 0.08)',
        };
      case 'critical':
        return {
          icon: 'error' as const,
          label: t('tripExpenses.riskCritical'),
          color: colors.state.error,
          bgColor: effectiveTheme === 'dark' ? 'rgba(186, 26, 26, 0.2)' : 'rgba(186, 26, 26, 0.08)',
        };
      case 'unavailable':
        return {
          icon: 'cloud-off' as const,
          label: t('tripExpenses.riskUnavailable'),
          color: colors.text.muted,
          bgColor: colors.background.surfaceVariant,
        };
      case 'not_configured':
      default:
        return {
          icon: 'info-outline' as const,
          label: t('tripExpenses.riskNotConfigured'),
          color: colors.text.muted,
          bgColor: colors.background.surfaceVariant,
        };
    }
  };

  const riskConfig = getRiskConfig();

  return (
    <View
      accessibilityLabel={`${t('tripExpenses.budgetRisk')}: ${riskConfig.label}`}
      style={[
        styles.container,
        {
          backgroundColor: riskConfig.bgColor,
          borderColor: riskConfig.color,
        },
      ]}>
      {/* Top Banner Row: Status & Quality Badge */}
      <View style={styles.headerRow}>
        <View style={styles.statusRow}>
          <MaterialIcons color={riskConfig.color} name={riskConfig.icon} size={18} />
          <Text style={[styles.statusText, { color: riskConfig.color }]}>
            {riskConfig.label}
          </Text>
        </View>

        {/* Completeness Badge */}
        {completeness === 'stale_fx' ? (
          <View style={[styles.badge, { backgroundColor: 'rgba(255, 179, 0, 0.15)' }]}>
            <Text style={[styles.badgeText, { color: effectiveTheme === 'dark' ? '#FFB74D' : '#F57C00' }]}>
              {t('tripExpenses.dataStaleFx')}
            </Text>
          </View>
        ) : completeness === 'incomplete' ? (
          <View style={[styles.badge, { backgroundColor: 'rgba(211, 47, 47, 0.15)' }]}>
            <Text style={[styles.badgeText, { color: colors.state.error }]}>
              {t('tripExpenses.dataIncomplete')}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Safe Suggestions */}
      {suggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion) => (
            <View key={suggestion.code} style={styles.suggestionRow}>
              <MaterialIcons color={riskConfig.color} name="tips-and-updates" size={14} />
              <Text style={[styles.suggestionText, { color: colors.text.primary }]}>
                {t(`safeSuggestion.${suggestion.code}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  suggestionsContainer: {
    gap: 4,
    marginTop: spacing.xs,
    paddingTop: 4,
  },
  suggestionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  suggestionText: {
    fontSize: 12,
    flex: 1,
  },
});
