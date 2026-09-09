import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabase/client';
import type {
  ExpenseCategory,
  ExpenseOrigin,
  TripExpenseCursor,
  TripExpenseRecord,
} from '../../integration/contracts';
import { IntegrationError } from '../../integration/errors';
import type { ExpenseAggregatePage } from '../../integration/expenseAggregate';
import {
  convertFx,
  FX_ATTRIBUTION,
  FX_ATTRIBUTION_URL,
  fxUnavailable,
  supportsFx,
  type FxPair,
  type FxRateRepository,
  type FxResult,
  type TripFxContext,
} from '../../integration/fxContract';
import { BudgetRiskService } from '../../integration/remote/budgetRiskService';
import { ExchangeRateFxRepository } from '../../integration/remote/exchangeRateFxRepository';
import { SupabaseTripExpenseAggregateRepository } from '../../integration/remote/supabaseTripExpenseAggregateRepository';
import { SupabaseTripExpenseLedgerRepository } from '../../integration/remote/supabaseTripExpenseRepository';
import { SupabaseTripFxContextRepository } from '../../integration/remote/supabaseTripFxContextRepository';
import type { BudgetRiskResult } from '../../integration/budgetRiskContract';
import { asTripId, isUuid } from '../../integration/validation';

export const LEDGER_PAGE_SIZE = 50;
export const MAX_LEDGER_ITEMS = 500;
export const QUICK_EXPENSE_MAX_AMOUNT = 9_999_999_999.99;

const quickExpenseAmountPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export function parseQuickExpenseAmount(value: string): number | null {
  if (value !== value.trim() || !quickExpenseAmountPattern.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > QUICK_EXPENSE_MAX_AMOUNT) return null;
  return parsed;
}

export type QuickExpenseDraft = {
  amount: string;
  currency: string;
  category: ExpenseCategory;
  origin: ExpenseOrigin;
  note: string;
};

export type TripExpensesControllerOptions = {
  simulateProviderFailure?: boolean;
  /** Display preference only. It is never treated as destination-currency truth. */
  initialDisplayCurrency?: string;
  fxContextRepoOverride?: SupabaseTripFxContextRepository;
  aggregateRepoOverride?: SupabaseTripExpenseAggregateRepository;
  ledgerRepoOverride?: SupabaseTripExpenseLedgerRepository;
  fxRepoOverride?: FxRateRepository;
  budgetRiskServiceOverride?: BudgetRiskService;
};

export type TripExpensesController = {
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  saving: boolean;
  errorKey: string | null;
  tripFxContext: TripFxContext | null;
  aggregate: ExpenseAggregatePage | null;
  expenses: TripExpenseRecord[];
  nextCursor: TripExpenseCursor | null;
  ledgerLimitReached: boolean;
  budgetRisk: BudgetRiskResult | null;
  displayCurrency: string;
  displayRates: Record<string, FxResult>;
  ratesAttribution: string;
  ratesAttributionUrl: string;
  hasProviderAttribution: boolean;
  ratesState: 'fresh' | 'stale' | 'unavailable' | 'none';
  quickAddVisible: boolean;
  quickExpenseDraft: QuickExpenseDraft;
  setDisplayCurrency: (currency: string) => void;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  updateDraft: <K extends keyof QuickExpenseDraft>(field: K, value: QuickExpenseDraft[K]) => void;
  submitQuickExpense: () => Promise<boolean>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => void;
  getConvertedAmount: (amount: number, fromCurrency: string) => {
    convertedFormatted: string | null;
    rate: string | null;
    state: 'fresh' | 'stale' | 'unavailable' | 'identity';
  };
};

const DEFAULT_DRAFT: QuickExpenseDraft = {
  amount: '',
  currency: 'USD',
  category: 'food',
  origin: 'actual',
  note: '',
};

type RatesBinding = {
  ownerId: string | null;
  destinationCurrency: string | null;
};

function mergeExpensePages(
  current: TripExpenseRecord[],
  incoming: TripExpenseRecord[]
): TripExpenseRecord[] {
  const seen = new Set(current.map((expense) => expense.id));
  const merged = [...current];
  for (const expense of incoming) {
    if (!seen.has(expense.id)) {
      seen.add(expense.id);
      merged.push(expense);
    }
    if (merged.length === MAX_LEDGER_ITEMS) break;
  }
  return merged;
}

export function useTripExpensesController(
  tripId: string,
  options?: TripExpensesControllerOptions
): TripExpensesController {
  const { user } = useAuth();
  const userId = user?.id;
  const preferredInitialCurrency =
    options?.initialDisplayCurrency && supportsFx(options.initialDisplayCurrency)
      ? options.initialDisplayCurrency
      : 'USD';

  const [stateOwnerId, setStateOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [tripFxContext, setTripFxContext] = useState<TripFxContext | null>(null);
  const [aggregate, setAggregate] = useState<ExpenseAggregatePage | null>(null);
  const [expenses, setExpenses] = useState<TripExpenseRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<TripExpenseCursor | null>(null);
  const [ledgerLimitReached, setLedgerLimitReached] = useState(false);
  const [budgetRisk, setBudgetRisk] = useState<BudgetRiskResult | null>(null);
  const [displayCurrency, setDisplayCurrencyState] = useState(preferredInitialCurrency);
  const [displayRates, setDisplayRates] = useState<Record<string, FxResult>>({});
  const [ratesBinding, setRatesBinding] = useState<RatesBinding>({
    ownerId: null,
    destinationCurrency: null,
  });
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickExpenseDraft, setQuickExpenseDraft] = useState<QuickExpenseDraft>({
    ...DEFAULT_DRAFT,
    currency: preferredInitialCurrency,
  });

  const activeReadAbort = useRef<AbortController | null>(null);
  const activePaginationAbort = useRef<AbortController | null>(null);
  const activeFxAbort = useRef<AbortController | null>(null);
  const activeMutationAbort = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const latestUserIdRef = useRef<string | undefined>(userId);
  const paginationInFlightRef = useRef(false);

  const repos = useMemo(() => {
    const fxContextRepo =
      options?.fxContextRepoOverride ?? new SupabaseTripFxContextRepository(supabase);
    const aggregateRepo =
      options?.aggregateRepoOverride ?? new SupabaseTripExpenseAggregateRepository(supabase);
    const ledgerRepo =
      options?.ledgerRepoOverride ?? new SupabaseTripExpenseLedgerRepository(supabase);
    const transport = options?.simulateProviderFailure
      ? async () => {
          throw new IntegrationError('providerUnavailable');
        }
      : fetch;
    const fxRepo = options?.fxRepoOverride ?? new ExchangeRateFxRepository(transport);
    const budgetRiskService =
      options?.budgetRiskServiceOverride ??
      new BudgetRiskService(fxContextRepo, aggregateRepo, fxRepo);
    return { fxContextRepo, aggregateRepo, ledgerRepo, fxRepo, budgetRiskService };
  }, [
    options?.simulateProviderFailure,
    options?.fxContextRepoOverride,
    options?.aggregateRepoOverride,
    options?.ledgerRepoOverride,
    options?.fxRepoOverride,
    options?.budgetRiskServiceOverride,
  ]);

  const isCurrentRequest = useCallback(
    (initiatingUserId: string, generation: number, signal: AbortSignal) =>
      !signal.aborted &&
      latestUserIdRef.current === initiatingUserId &&
      generationRef.current === generation,
    []
  );

  const loadCoreData = useCallback(
    async (initiatingUserId: string, generation: number, isRefresh: boolean) => {
      if (!tripId || !isUuid(tripId)) {
        if (latestUserIdRef.current === initiatingUserId && generationRef.current === generation) {
          setErrorKey('tripExpenses.errorLoading');
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      activeReadAbort.current?.abort();
      activePaginationAbort.current?.abort();
      paginationInFlightRef.current = false;
      const controller = new AbortController();
      activeReadAbort.current = controller;
      const { signal } = controller;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorKey(null);

      try {
        const typedTripId = asTripId(tripId);
        const [context, aggregatePage, expensePage, risk] = await Promise.all([
          repos.fxContextRepo.getTripFxContext(typedTripId, signal),
          repos.aggregateRepo.getAggregate(
            { tripId: typedTripId, groupBy: 'currency', limit: 50 },
            signal
          ),
          repos.ledgerRepo.listExpenses(
            { tripId: typedTripId, limit: LEDGER_PAGE_SIZE },
            signal
          ),
          repos.budgetRiskService.evaluateTripBudgetRisk(
            { tripId: typedTripId, includeCategoryBreakdown: true },
            signal
          ),
        ]);
        if (!isCurrentRequest(initiatingUserId, generation, signal)) return;

        setTripFxContext(context);
        setAggregate(aggregatePage);
        setExpenses(expensePage.items.slice(0, MAX_LEDGER_ITEMS));
        setNextCursor(
          expensePage.items.length >= MAX_LEDGER_ITEMS ? null : expensePage.nextCursor
        );
        setLedgerLimitReached(expensePage.items.length >= MAX_LEDGER_ITEMS);
        setBudgetRisk(risk);
        setQuickExpenseDraft((previous) => ({
          ...previous,
          currency:
            previous.amount === '' && previous.note === ''
              ? context.originalBudget.currency ?? previous.currency
              : previous.currency,
        }));
      } catch (error) {
        if (!isCurrentRequest(initiatingUserId, generation, signal)) return;
        if (!(error instanceof IntegrationError && error.code === 'cancelled')) {
          setErrorKey('tripExpenses.errorLoading');
        }
      } finally {
        if (isCurrentRequest(initiatingUserId, generation, signal)) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [isCurrentRequest, repos, tripId]
  );

  useLayoutEffect(() => {
    latestUserIdRef.current = userId;
    generationRef.current += 1;
    activeReadAbort.current?.abort();
    activePaginationAbort.current?.abort();
    activeFxAbort.current?.abort();
    activeMutationAbort.current?.abort();
    paginationInFlightRef.current = false;
  }, [repos, tripId, userId]);

  useEffect(() => {
    const generation = generationRef.current;

    // State is tagged to its owner and old financial values are purged before
    // starting any request for the next identity.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStateOwnerId(userId ?? null);
    setTripFxContext(null);
    setAggregate(null);
    setExpenses([]);
    setNextCursor(null);
    setLedgerLimitReached(false);
    setBudgetRisk(null);
    setDisplayRates({});
    setRatesBinding({ ownerId: null, destinationCurrency: null });
    setErrorKey(null);
    setRefreshing(false);
    setLoadingMore(false);
    setSaving(false);
    setQuickAddVisible(false);
    setQuickExpenseDraft({ ...DEFAULT_DRAFT, currency: preferredInitialCurrency });

    if (!userId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    void loadCoreData(userId, generation, false);
    return () => {
      activeReadAbort.current?.abort();
      activePaginationAbort.current?.abort();
      activeFxAbort.current?.abort();
      activeMutationAbort.current?.abort();
    };
  }, [userId, tripId, repos, loadCoreData, preferredInitialCurrency]);

  const visibleForCurrentUser = Boolean(userId && stateOwnerId === userId);
  const visibleContext = visibleForCurrentUser ? tripFxContext : null;
  const visibleAggregate = visibleForCurrentUser ? aggregate : null;
  const visibleExpenses = visibleForCurrentUser ? expenses : [];
  const visibleBudgetRisk = visibleForCurrentUser ? budgetRisk : null;
  const visibleNextCursor = visibleForCurrentUser ? nextCursor : null;
  const effectiveDisplayRates = useMemo(
    () =>
      visibleForCurrentUser &&
      ratesBinding.ownerId === userId &&
      ratesBinding.destinationCurrency === displayCurrency
        ? displayRates
        : {},
    [displayCurrency, displayRates, ratesBinding, userId, visibleForCurrentUser]
  );

  const displayRateSources = useMemo(() => {
    const currencies = new Set<string>();
    visibleAggregate?.items.forEach((item) => currencies.add(item.currency));
    if (visibleContext?.originalBudget.currency) {
      currencies.add(visibleContext.originalBudget.currency);
    }
    currencies.delete(displayCurrency);
    return Array.from(currencies).sort();
  }, [displayCurrency, visibleAggregate, visibleContext]);
  useEffect(() => {
    activeFxAbort.current?.abort();
    if (!userId || !visibleForCurrentUser || (!visibleAggregate && !visibleContext)) return;

    const generation = generationRef.current;
    const controller = new AbortController();
    activeFxAbort.current = controller;
    const { signal } = controller;

    const loadDisplayRates = async () => {
      const ratesMap: Record<string, FxResult> = {};
      const pairs: FxPair[] = [];
      for (const sourceCurrency of displayRateSources) {
        const pair = { sourceCurrency, destinationCurrency: displayCurrency };
        if (supportsFx(sourceCurrency) && supportsFx(displayCurrency)) pairs.push(pair);
        else ratesMap[sourceCurrency] = fxUnavailable(pair, 'unsupportedCurrency');
      }

      try {
        if (pairs.length > 0) {
          const results = await repos.fxRepo.getQuotes({ pairs }, signal);
          for (const result of results) ratesMap[result.sourceCurrency] = result;
        }
        if (!isCurrentRequest(userId, generation, signal)) return;
        setDisplayRates(ratesMap);
        setRatesBinding({ ownerId: userId, destinationCurrency: displayCurrency });
      } catch (error) {
        if (!isCurrentRequest(userId, generation, signal)) return;
        if (!(error instanceof IntegrationError && error.code === 'cancelled')) {
          for (const pair of pairs) {
            ratesMap[pair.sourceCurrency] = fxUnavailable(pair, 'providerUnavailable');
          }
          setDisplayRates(ratesMap);
          setRatesBinding({ ownerId: userId, destinationCurrency: displayCurrency });
        }
      }
    };

    void loadDisplayRates();
    return () => controller.abort();
  }, [
    displayCurrency,
    displayRateSources,
    isCurrentRequest,
    repos.fxRepo,
    userId,
    visibleAggregate,
    visibleContext,
    visibleForCurrentUser,
  ]);

  const setDisplayCurrency = useCallback((newCurrency: string) => {
    if (supportsFx(newCurrency)) setDisplayCurrencyState(newCurrency);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await loadCoreData(userId, generationRef.current, true);
  }, [loadCoreData, userId]);

  const retry = useCallback(() => {
    if (!userId) return;
    void loadCoreData(userId, generationRef.current, false);
  }, [loadCoreData, userId]);

  const loadMore = useCallback(async () => {
    if (
      !userId ||
      !visibleForCurrentUser ||
      !visibleNextCursor ||
      ledgerLimitReached ||
      paginationInFlightRef.current ||
      !isUuid(tripId)
    ) {
      return;
    }

    paginationInFlightRef.current = true;
    activePaginationAbort.current?.abort();
    const controller = new AbortController();
    activePaginationAbort.current = controller;
    const { signal } = controller;
    const generation = generationRef.current;
    const requestedCursor = visibleNextCursor;
    setLoadingMore(true);

    try {
      const page = await repos.ledgerRepo.listExpenses(
        { tripId: asTripId(tripId), limit: LEDGER_PAGE_SIZE, cursor: requestedCursor },
        signal
      );
      if (!isCurrentRequest(userId, generation, signal)) return;

      const merged = mergeExpensePages(expenses, page.items);
      const cursorRepeated =
        page.nextCursor?.createdAt === requestedCursor.createdAt &&
        page.nextCursor?.id === requestedCursor.id;
      const reachedBound = merged.length >= MAX_LEDGER_ITEMS;
      setExpenses(merged);
      setLedgerLimitReached(reachedBound);
      setNextCursor(reachedBound || cursorRepeated ? null : page.nextCursor);
    } catch (error) {
      if (!isCurrentRequest(userId, generation, signal)) return;
      if (!(error instanceof IntegrationError && error.code === 'cancelled')) {
        setErrorKey('tripExpenses.errorLoading');
      }
    } finally {
      if (isCurrentRequest(userId, generation, signal)) setLoadingMore(false);
      paginationInFlightRef.current = false;
    }
  }, [
    expenses,
    isCurrentRequest,
    ledgerLimitReached,
    repos.ledgerRepo,
    tripId,
    userId,
    visibleForCurrentUser,
    visibleNextCursor,
  ]);

  const openQuickAdd = useCallback(() => setQuickAddVisible(true), []);
  const closeQuickAdd = useCallback(() => setQuickAddVisible(false), []);
  const updateDraft = useCallback(
    <K extends keyof QuickExpenseDraft>(field: K, value: QuickExpenseDraft[K]) => {
      setQuickExpenseDraft((previous) => ({ ...previous, [field]: value }));
    },
    []
  );

  const submitQuickExpense = useCallback(async (): Promise<boolean> => {
    const amount = parseQuickExpenseAmount(quickExpenseDraft.amount);
    if (!userId || !visibleForCurrentUser || amount === null || !isUuid(tripId)) return false;

    activeMutationAbort.current?.abort();
    const controller = new AbortController();
    activeMutationAbort.current = controller;
    const { signal } = controller;
    const generation = generationRef.current;
    setSaving(true);

    try {
      await repos.ledgerRepo.createExpense(
        {
          tripId: asTripId(tripId),
          amount,
          currency: quickExpenseDraft.currency,
          category: quickExpenseDraft.category,
          origin: quickExpenseDraft.origin,
          note: quickExpenseDraft.note.trim() || null,
          spentAt: new Date().toISOString(),
        },
        signal
      );
      if (!isCurrentRequest(userId, generation, signal)) return false;

      setQuickExpenseDraft((previous) => ({ ...previous, amount: '', note: '' }));
      setQuickAddVisible(false);
      await loadCoreData(userId, generation, true);
      return isCurrentRequest(userId, generation, signal);
    } catch (error) {
      if (!isCurrentRequest(userId, generation, signal)) return false;
      if (!(error instanceof IntegrationError && error.code === 'cancelled')) {
        setErrorKey('tripExpenses.errorLoading');
      }
      return false;
    } finally {
      if (isCurrentRequest(userId, generation, signal)) setSaving(false);
    }
  }, [
    isCurrentRequest,
    loadCoreData,
    quickExpenseDraft,
    repos.ledgerRepo,
    tripId,
    userId,
    visibleForCurrentUser,
  ]);

  const ratesState = useMemo<'fresh' | 'stale' | 'unavailable' | 'none'>(() => {
    const values = Object.values(effectiveDisplayRates);
    if (values.length === 0) return 'none';
    if (values.some((value) => value.state === 'unavailable')) return 'unavailable';
    if (values.some((value) => value.state === 'stale')) return 'stale';
    return 'fresh';
  }, [effectiveDisplayRates]);

  const hasProviderAttribution = useMemo(
    () =>
      Object.values(effectiveDisplayRates).some(
        (result) =>
          (result.state === 'fresh' || result.state === 'stale') &&
          result.quote?.attribution === FX_ATTRIBUTION
      ),
    [effectiveDisplayRates]
  );

  const getConvertedAmount = useCallback(
    (amount: number, fromCurrency: string) => {
      if (fromCurrency === displayCurrency) {
        return { convertedFormatted: null, rate: null, state: 'identity' as const };
      }
      const fxResult = effectiveDisplayRates[fromCurrency];
      if (!fxResult || fxResult.state === 'unavailable' || !fxResult.quote) {
        return { convertedFormatted: null, rate: null, state: 'unavailable' as const };
      }
      const conversion = convertFx(amount.toFixed(2), fromCurrency, fxResult, Date.now());
      return {
        convertedFormatted: conversion.convertedAmount
          ? `${conversion.convertedAmount} ${displayCurrency}`
          : null,
        rate: fxResult.quote.rate,
        state: fxResult.state,
      };
    },
    [displayCurrency, effectiveDisplayRates]
  );

  return {
    loading: userId ? !visibleForCurrentUser || loading : false,
    refreshing: visibleForCurrentUser && refreshing,
    loadingMore: visibleForCurrentUser && loadingMore,
    saving: visibleForCurrentUser && saving,
    errorKey: visibleForCurrentUser ? errorKey : null,
    tripFxContext: visibleContext,
    aggregate: visibleAggregate,
    expenses: visibleExpenses,
    nextCursor: visibleNextCursor,
    ledgerLimitReached: visibleForCurrentUser && ledgerLimitReached,
    budgetRisk: visibleBudgetRisk,
    displayCurrency,
    displayRates: effectiveDisplayRates,
    ratesAttribution: FX_ATTRIBUTION,
    ratesAttributionUrl: FX_ATTRIBUTION_URL,
    hasProviderAttribution,
    ratesState,
    quickAddVisible: visibleForCurrentUser && quickAddVisible,
    quickExpenseDraft,
    setDisplayCurrency,
    openQuickAdd,
    closeQuickAdd,
    updateDraft,
    submitQuickExpense,
    loadMore,
    refresh,
    retry,
    getConvertedAmount,
  };
}
