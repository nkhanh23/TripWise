import type { ThemePalette } from './types';

export const lightPalette: ThemePalette = {
  background: {
    canvas: '#FCF9F8',
    surface: '#FFFFFF',
    surfaceVariant: '#E5E2E1',
  },
  text: {
    primary: '#1C1B1B',
    secondary: '#414755',
    muted: '#717786',
    inverse: '#FFFFFF',
  },
  brand: {
    primary: '#0058BC',
    primaryContainer: '#0070EB',
    red: '#E6392E',
    yellow: '#FFD166',
    lime: '#B8F24A',
  },
  border: {
    default: '#C1C6D7',
    subtle: 'rgba(193, 198, 215, 0.4)',
  },
  icon: {
    primary: '#0058BC',
    secondary: '#414755',
    muted: '#717786',
  },
  state: {
    success: '#2E7D32',
    warning: '#ED6C02',
    error: '#BA1A1A',
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.45)',
    gradientBottom: 'rgba(0, 0, 0, 0.55)',
  },
};

export const darkPalette: ThemePalette = {
  background: {
    canvas: '#131313',
    surface: '#20201F',
    surfaceVariant: '#2A2A2A',
  },
  text: {
    primary: '#E5E2E1',
    secondary: '#C1C6D7',
    muted: '#8B90A0',
    inverse: '#131313',
  },
  brand: {
    primary: '#ADC6FF',
    primaryContainer: '#4B8EFF',
    red: '#FFB4AA',
    yellow: '#FFD166',
    lime: '#C4F668',
  },
  border: {
    default: '#414755',
    subtle: 'rgba(255, 255, 255, 0.12)',
  },
  icon: {
    primary: '#ADC6FF',
    secondary: '#C1C6D7',
    muted: '#8B90A0',
  },
  state: {
    success: '#4CAF50',
    warning: '#FFA726',
    error: '#FFB4AB',
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.75)',
    gradientBottom: 'rgba(0, 0, 0, 0.85)',
  },
};
