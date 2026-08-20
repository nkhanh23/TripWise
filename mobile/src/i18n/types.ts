export type AppLocale = 'en' | 'vi';

export type TranslationParams = Record<string, string | number>;

export type TranslationContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: TranslationParams) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateRange: (startDate: string | Date, endDate: string | Date) => string;
  formatCurrency: (amount: number | string, currency?: string) => string;
  formatNumber: (num: number) => string;
  formatDistance: (meters: number) => string;
};
