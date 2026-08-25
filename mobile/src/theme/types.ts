export type ThemePreference = "system" | "light" | "dark";

export type EffectiveTheme = "light" | "dark";

export type ThemePalette = {
  background: {
    canvas: string;
    surface: string;
    surfaceVariant: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  brand: {
    primary: string;
    primaryContainer: string;
    red: string;
    yellow: string;
    lime: string;
  };
  border: {
    default: string;
    subtle: string;
  };
  icon: {
    primary: string;
    secondary: string;
    muted: string;
  };
  state: {
    success: string;
    warning: string;
    error: string;
  };
  overlay: {
    scrim: string;
    gradientBottom: string;
  };
};

export type ThemeContextValue = {
  themePreference: ThemePreference;
  effectiveTheme: EffectiveTheme;
  colors: ThemePalette;
  setThemePreference: (pref: ThemePreference) => void;
};
