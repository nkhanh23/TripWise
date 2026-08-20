import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { enTranslations } from './en';
import {
  formatCurrency as formatCurrencyHelper,
  formatDate as formatDateHelper,
  formatDateRange as formatDateRangeHelper,
  formatDistance as formatDistanceHelper,
  formatNumber as formatNumberHelper,
} from './formatters';
import type { AppLocale, TranslationContextValue, TranslationParams } from './types';
import { viTranslations } from './vi';

function defaultTranslate(key: string, params?: TranslationParams): string {
  let message: string | undefined = enTranslations[key] || key;
  if (params) {
    Object.entries(params).forEach(([placeholder, val]) => {
      message = message!.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(val));
    });
  }
  return message;
}

const TranslationContext = createContext<TranslationContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: defaultTranslate,
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
    formatDateHelper(date, 'en', options),
  formatDateRange: (s: string | Date, e: string | Date) => formatDateRangeHelper(s, e, 'en'),
  formatCurrency: (amount: number | string, currency = 'USD') =>
    formatCurrencyHelper(amount, currency, 'en'),
  formatNumber: (num: number) => formatNumberHelper(num, 'en'),
  formatDistance: (meters: number) => formatDistanceHelper(meters, 'en'),
});

type Props = {
  children: React.ReactNode;
  initialLocale?: AppLocale;
};

export function TranslationProvider({ children, initialLocale = 'en' }: Props) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  const setLocale = useCallback((newLocale: AppLocale) => {
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      let message: string | undefined;

      if (locale === 'vi') {
        message = viTranslations[key] || enTranslations[key];
      } else {
        message = enTranslations[key];
      }

      if (!message) {
        message = key;
      }

      if (params) {
        Object.entries(params).forEach(([placeholder, val]) => {
          message = message!.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(val));
        });
      }

      return message;
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
      return formatDateHelper(date, locale, options);
    },
    [locale]
  );

  const formatDateRange = useCallback(
    (startDate: string | Date, endDate: string | Date) => {
      return formatDateRangeHelper(startDate, endDate, locale);
    },
    [locale]
  );

  const formatCurrency = useCallback(
    (amount: number | string, currency = 'USD') => {
      return formatCurrencyHelper(amount, currency, locale);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (num: number) => {
      return formatNumberHelper(num, locale);
    },
    [locale]
  );

  const formatDistance = useCallback(
    (meters: number) => {
      return formatDistanceHelper(meters, locale);
    },
    [locale]
  );

  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatDate,
      formatDateRange,
      formatCurrency,
      formatNumber,
      formatDistance,
    }),
    [
      locale,
      setLocale,
      t,
      formatDate,
      formatDateRange,
      formatCurrency,
      formatNumber,
      formatDistance,
    ]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  return useContext(TranslationContext);
}
