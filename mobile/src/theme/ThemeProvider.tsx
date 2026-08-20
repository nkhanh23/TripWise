import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette } from './palettes';
import type { EffectiveTheme, ThemeContextValue, ThemePreference } from './types';

const ThemeContext = createContext<ThemeContextValue>({
  themePreference: 'system',
  effectiveTheme: 'light',
  colors: lightPalette,
  setThemePreference: () => {},
});

type Props = {
  children: React.ReactNode;
  initialPreference?: ThemePreference;
};

export function ThemeProvider({ children, initialPreference = 'system' }: Props) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(initialPreference);

  const effectiveTheme: EffectiveTheme = useMemo(() => {
    if (themePreference === 'dark') {
      return 'dark';
    }
    if (themePreference === 'light') {
      return 'light';
    }
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [themePreference, systemColorScheme]);

  const colors = useMemo(() => {
    return effectiveTheme === 'dark' ? darkPalette : lightPalette;
  }, [effectiveTheme]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      effectiveTheme,
      colors,
      setThemePreference,
    }),
    [themePreference, effectiveTheme, colors, setThemePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
