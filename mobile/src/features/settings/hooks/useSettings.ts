import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import {
  getSettings,
  subscribeToSettings,
  updateSettings,
} from '../data/settingsStore';
import type {
  AppSettings,
  CurrencyCode,
  DistanceUnit,
  NotificationPreferences,
} from '../types';

export function useSettings() {
  const { themePreference, effectiveTheme, setThemePreference } = useTheme();
  const { locale, setLocale, t } = useTranslation();

  const [settings, setSettings] = useState<AppSettings>(getSettings());

  useEffect(() => {
    const unsub = subscribeToSettings(() => {
      setSettings(getSettings());
    });
    return () => {
      unsub();
    };
  }, []);

  const setCurrency = useCallback((currency: CurrencyCode) => {
    updateSettings({ currency });
  }, []);

  const setDistanceUnit = useCallback((distanceUnit: DistanceUnit) => {
    updateSettings({ distanceUnit });
  }, []);

  const setNotifications = useCallback(
    (notifications: Partial<NotificationPreferences>) => {
      updateSettings({
        notifications: {
          ...settings.notifications,
          ...notifications,
        },
      });
    },
    [settings.notifications]
  );

  return {
    // Theme
    themePreference,
    effectiveTheme,
    setThemePreference,

    // Language / Locale
    locale,
    setLocale,
    t,

    // General & Notifications
    currency: settings.currency,
    setCurrency,
    distanceUnit: settings.distanceUnit,
    setDistanceUnit,
    notifications: settings.notifications,
    setNotifications,
  };
}
