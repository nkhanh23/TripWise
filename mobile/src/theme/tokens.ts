import { lightPalette } from './palettes';

export const colors = {
  ...lightPalette,
  border: lightPalette.border.default,
  outlineVariant: lightPalette.border.default,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const typography = {
  body: 16,
  bodySmall: 14,
  title: 28,
  titleSmall: 18,
  lineHeight: 24,
  fontWeight: {
    regular: '400',
    semibold: '600',
    bold: '700',
  },
} as const;

export const radius = {
  sm: 4,
  input: 8,
  control: 16,
  card: 20,
  pill: 9999,
} as const;
