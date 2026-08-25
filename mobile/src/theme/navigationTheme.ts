import { DefaultTheme, type Theme } from "@react-navigation/native";

import type { ThemePalette } from "./types";

export function getNavigationTheme(
  palette: ThemePalette,
  isDark: boolean,
): Theme {
  return {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: palette.brand.primary,
      background: palette.background.canvas,
      card: palette.background.surface,
      text: palette.text.primary,
      border: palette.border.default,
      notification: palette.brand.red,
    },
  };
}
