export const colors = {
  background: {
    canvas: '#F7E7C6',
    surface: '#FFF6DE',
  },
  brand: {
    primary: '#20A7D8',
    red: '#E6392E',
    yellow: '#FFD166',
    lime: '#B8F24A',
  },
  text: {
    primary: '#111111',
    secondary: '#3A2F2A',
    muted: '#7A6A58',
    inverse: '#FFFFFF',
  },
  border: '#111111',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  body: 16,
  title: 28,
  lineHeight: 24,
  fontWeight: {
    regular: '400',
    bold: '700',
  },
} as const;

export const radius = {
  card: 20,
  control: 16,
} as const;
