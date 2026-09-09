import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ExpenseCategory, TripExpenseRecord } from '../../../integration/contracts';
import { FX_CURRENCIES } from '../../../integration/fxContract';
import { useTranslation } from '../../../i18n';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { FxAttributionBanner } from '../components/FxAttributionBanner';
import { QuickExpenseModal } from '../components/QuickExpenseModal';
import { TripBudgetRiskBanner } from '../components/TripBudgetRiskBanner';
import { TripBudgetSummaryCard } from '../components/TripBudgetSummaryCard';
import {
  useTripExpensesController,
  type TripExpensesControllerOptions,
} from '../useTripExpensesController';

type Props = NativeStackScreenProps<RootStackParamList, 'TripExpenses'> & {
  controllerOptions?: TripExpensesControllerOptions;
};

const CATEGORY_ICONS: Record<ExpenseCategory, keyof typeof MaterialIcons.glyphMap> = {
  food: 'restaurant',
  transport: 'directions-car',
  accommodation: 'hotel',
  activity: 'local-activity',
  shopping: 'shopping-bag',
  ticket: 'confirmation-number',
  personal: 'person',
  reservation: 'event-seat',
  other: 'receipt',
};

export const TripExpensesScreen = memo(function TripExpensesScreen({
  navigation,
  route,
  controllerOptions,
}: Props) {
  const { tripId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, formatCurrency, formatDate } = useTranslation();

  const controller = useTripExpensesController(tripId, controllerOptions);

  const {
    loading,
    refreshing,
    saving,
    errorKey,
    tripFxContext,
    aggregate,
    expenses,
    nextCursor,
    loadingMore,
    ledgerLimitReached,
    budgetRisk,
    displayCurrency,
    ratesAttribution,
    ratesAttributionUrl,
    ratesState,
    hasProviderAttribution,
    quickAddVisible,
    quickExpenseDraft,
    setDisplayCurrency,
    openQuickAdd,
    closeQuickAdd,
    updateDraft,
    submitQuickExpense,
    refresh,
    loadMore,
    retry,
    getConvertedAmount,
  } = controller;

  // Display currency is a user preference. Aggregate currency groups are the
  // bounded authoritative inventory; destination currency is never guessed.
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    if (tripFxContext?.originalBudget.currency) set.add(tripFxContext.originalBudget.currency);
    aggregate?.items.forEach((item) => set.add(item.currency));
    set.add(displayCurrency);
    return Array.from(set).filter((c) => FX_CURRENCIES.includes(c as any));
  }, [aggregate, displayCurrency, tripFxContext]);

  const amounts = budgetRisk?.amounts;

  // Header Component
  const listHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        {/* 1. Budget Summary Card */}
        <TripBudgetSummaryCard
          availableCurrencies={availableCurrencies}
          displayCurrency={displayCurrency}
          onSelectDisplayCurrency={setDisplayCurrency}
          originalBudgetAmount={amounts?.totalBudget ?? tripFxContext?.originalBudget.amount ?? null}
          originalBudgetCurrency={amounts?.budgetCurrency ?? tripFxContext?.originalBudget.currency ?? null}
          accountingCurrency={amounts?.budgetCurrency ?? null}
          currencyFractionDigits={amounts?.currencyFractionDigits ?? null}
          plannedCommitments={amounts?.plannedCommitments ?? null}
          realizedSpend={amounts?.realizedSpend ?? null}
          remainingBudget={amounts?.remainingBudget ?? null}
        />

        {/* 2. Deterministic Budget Risk Banner */}
        <TripBudgetRiskBanner risk={budgetRisk} />

        {/* 3. FX Attribution & Quality Banner */}
        <FxAttributionBanner
          attribution={ratesAttribution}
          attributionUrl={ratesAttributionUrl}
          hasProviderAttribution={hasProviderAttribution}
          ratesState={ratesState}
        />

        {/* 4. Section Title & Quick Add CTA */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {t('tripExpenses.recentExpenses')}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.background.surfaceVariant }]}>
              <Text style={[styles.countText, { color: colors.text.secondary }]}>
                {expenses.length}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityHint={t('tripExpenses.addExpense')}
            accessibilityLabel={t('tripExpenses.quickAdd')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={openQuickAdd}
            style={[styles.addButton, { backgroundColor: colors.brand.primary }]}>
            <MaterialIcons color={colors.text.inverse} name="add" size={16} />
            <Text style={[styles.addButtonText, { color: colors.text.inverse }]}>
              {t('tripExpenses.addExpense')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }, [
    availableCurrencies,
    displayCurrency,
    setDisplayCurrency,
    amounts,
    tripFxContext,
    budgetRisk,
    ratesAttribution,
    ratesAttributionUrl,
    ratesState,
    expenses.length,
    openQuickAdd,
    hasProviderAttribution,
    colors,
    t,
  ]);

  // Empty State Component
  const listEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons color={colors.text.muted} name="receipt-long" size={48} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
          {t('tripExpenses.emptyTitle')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
          {t('tripExpenses.emptySubtitle')}
        </Text>
        <Pressable
          accessibilityLabel={t('tripExpenses.addExpense')}
          accessibilityRole="button"
          onPress={openQuickAdd}
          style={[styles.emptyCTA, { backgroundColor: colors.brand.primary }]}>
          <Text style={[styles.emptyCTAText, { color: colors.text.inverse }]}>
            {t('tripExpenses.addExpense')}
          </Text>
        </Pressable>
      </View>
    );
  }, [loading, colors, t, openQuickAdd]);

  // Render Item
  const renderItem = useCallback(({ item }: { item: TripExpenseRecord }) => {
    const iconName = CATEGORY_ICONS[item.category] || 'receipt';
    const isPlanned = item.origin === 'planned';
    const conversion = getConvertedAmount(item.amount, item.currency);

    return (
      <View
        accessibilityLabel={`${item.category}: ${formatCurrency(item.amount, item.currency)}`}
        style={[
          styles.expenseItem,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
          },
        ]}>
        {/* Category Icon */}
        <View
          style={[
            styles.iconCircle,
            {
                  backgroundColor: colors.background.surfaceVariant,
            },
          ]}>
          <MaterialIcons
            color={isPlanned ? colors.text.secondary : colors.brand.primary}
            name={iconName}
            size={20}
          />
        </View>

        {/* Expense Details */}
        <View style={styles.detailsCol}>
          <Text numberOfLines={1} style={[styles.expenseTitle, { color: colors.text.primary }]}>
            {item.note || t(`expenseCategory.${item.category}`)}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.text.muted }]}>
              {item.spentAt ? formatDate(item.spentAt) : formatDate(item.createdAt)}
            </Text>
            {isPlanned ? (
              <View style={[styles.originTag, { backgroundColor: colors.background.surfaceVariant }]}>
                <Text style={[styles.originTagText, { color: colors.text.secondary }]}>
                  {t('tripExpenses.originPlanned')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Amount & Dual-Currency Conversion */}
        <View style={styles.amountCol}>
          <Text
            style={[
              styles.amountText,
              {
                color: isPlanned ? colors.text.secondary : colors.text.primary,
                fontStyle: isPlanned ? 'italic' : 'normal',
              },
            ]}>
            {formatCurrency(item.amount, item.currency)}
          </Text>
          {conversion.convertedFormatted ? (
            <Text style={[styles.convertedText, { color: colors.text.muted }]}>
              ≈ {conversion.convertedFormatted}
              {conversion.state === 'stale' ? ` (${t('tripExpenses.rateStaleShort')})` : ''}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }, [colors, formatCurrency, formatDate, getConvertedAmount, t]);

  const listFooter = useMemo(() => {
    if (loadingMore) {
      return <ActivityIndicator color={colors.brand.primary} style={styles.footerLoader} />;
    }
    if (ledgerLimitReached) {
      return (
        <Text style={[styles.paginationNotice, { color: colors.text.muted }]}>
          {t('tripExpenses.ledgerLimitReached')}
        </Text>
      );
    }
    if (!nextCursor) return null;
    return (
      <Pressable
        accessibilityLabel={t('tripExpenses.loadMore')}
        accessibilityRole="button"
        onPress={() => void loadMore()}
        style={[styles.loadMoreButton, { borderColor: colors.border.default }]}>
        <Text style={[styles.loadMoreText, { color: colors.brand.primary }]}>
          {t('tripExpenses.loadMore')}
        </Text>
      </Pressable>
    );
  }, [colors, ledgerLimitReached, loadMore, loadingMore, nextCursor, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas, paddingTop: insets.top }]}>
      {/* Screen Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border.subtle }]}>
        <Pressable
          accessibilityHint="Go back"
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <MaterialIcons color={colors.text.primary} name="arrow-back" size={24} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.screenTitle, { color: colors.text.primary }]}>
          {t('tripExpenses.title')}
        </Text>
        <Pressable
          accessibilityLabel={t('tripExpenses.addExpense')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={openQuickAdd}
          style={styles.topBarAction}>
          <MaterialIcons color={colors.brand.primary} name="add-circle-outline" size={24} />
        </Pressable>
      </View>

      {/* Loading Spinner */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : errorKey ? (
        <View accessibilityRole="alert" style={styles.centerContainer}>
          <MaterialIcons color={colors.state.error} name="error-outline" size={44} />
          <Text style={[styles.errorTitle, { color: colors.state.error }]}>
            {t(errorKey)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={[styles.retryButton, { backgroundColor: colors.brand.primary }]}>
            <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>
              {t('tripExpenses.retry')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={expenses}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              colors={[colors.brand.primary]}
              onRefresh={refresh}
              refreshing={refreshing}
              tintColor={colors.brand.primary}
            />
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Quick Add Modal */}
      <QuickExpenseModal
        draft={quickExpenseDraft}
        onClose={closeQuickAdd}
        onSubmit={submitQuickExpense}
        onUpdateDraft={updateDraft}
        saving={saving}
        visible={quickAddVisible}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  screenTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  topBarAction: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  countBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  expenseItem: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  detailsCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  expenseTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
  },
  originTag: {
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  originTagText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  convertedText: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyCTA: {
    borderRadius: radius.card,
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  emptyCTAText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.sm,
  },
  retryButton: {
    borderRadius: radius.card,
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  footerLoader: {
    marginVertical: spacing.md,
  },
  loadMoreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    justifyContent: 'center',
    marginVertical: spacing.md,
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: spacing.md,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  paginationNotice: {
    fontSize: 12,
    margin: spacing.md,
    textAlign: 'center',
  },
});
