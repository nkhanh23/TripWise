import type { AppSettings, CurrencyOption } from "../types";

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  {
    code: "USD",
    nameKey: "US Dollar",
    defaultName: "US Dollar",
    countryKey: "United States",
    defaultCountry: "United States",
    symbol: "$",
    isSuggested: true,
  },
  {
    code: "VND",
    nameKey: "Vietnamese Dong",
    defaultName: "Vietnamese Dong",
    countryKey: "Vietnam",
    defaultCountry: "Vietnam",
    symbol: "₫",
    isSuggested: true,
  },
  {
    code: "THB",
    nameKey: "Thai Baht",
    defaultName: "Thai Baht",
    countryKey: "Thailand",
    defaultCountry: "Thailand",
    symbol: "฿",
    isSuggested: true,
  },
  {
    code: "JPY",
    nameKey: "Japanese Yen",
    defaultName: "Japanese Yen",
    countryKey: "Japan",
    defaultCountry: "Japan",
    symbol: "¥",
    isSuggested: true,
  },
  {
    code: "EUR",
    nameKey: "Euro",
    defaultName: "Euro",
    countryKey: "European Union",
    defaultCountry: "European Union",
    symbol: "€",
    isSuggested: false,
  },
  {
    code: "GBP",
    nameKey: "British Pound",
    defaultName: "British Pound",
    countryKey: "United Kingdom",
    defaultCountry: "United Kingdom",
    symbol: "£",
    isSuggested: false,
  },
  {
    code: "SGD",
    nameKey: "Singapore Dollar",
    defaultName: "Singapore Dollar",
    countryKey: "Singapore",
    defaultCountry: "Singapore",
    symbol: "S$",
    isSuggested: false,
  },
  {
    code: "KRW",
    nameKey: "South Korean Won",
    defaultName: "South Korean Won",
    countryKey: "South Korea",
    defaultCountry: "South Korea",
    symbol: "₩",
    isSuggested: false,
  },
];

export const defaultSettings: AppSettings = {
  currency: "USD",
  distanceUnit: "km",
  notifications: {
    tripReminders: false,
    itineraryReminders: false,
  },
};

type Listener = () => void;
const listeners = new Set<Listener>();

let currentSettings: AppSettings = { ...defaultSettings };

export function getSettings(): AppSettings {
  return { ...currentSettings };
}

export function updateSettings(partial: Partial<AppSettings>): void {
  currentSettings = {
    ...currentSettings,
    ...partial,
    notifications: {
      ...currentSettings.notifications,
      ...(partial.notifications || {}),
    },
  };
  notifyListeners();
}

export function resetSettings(): void {
  currentSettings = { ...defaultSettings };
  notifyListeners();
}

export function subscribeToSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignored
    }
  });
}
