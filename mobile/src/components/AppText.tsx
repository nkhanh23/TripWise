import type { PropsWithChildren } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { typography } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type AppTextProps = PropsWithChildren<{
  variant?: 'body' | 'title' | 'caption' | 'muted';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}>;

export function AppText({ children, variant = 'body', style, numberOfLines }: AppTextProps) {
  const { colors } = useTheme();

  const getVariantColor = () => {
    switch (variant) {
      case 'title':
        return colors.text.primary;
      case 'caption':
      case 'muted':
        return colors.text.muted;
      case 'body':
      default:
        return colors.text.secondary;
    }
  };

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        variant === 'title' ? styles.title : styles.body,
        { color: getVariantColor() },
        style,
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: undefined,
  },
  body: {
    fontSize: typography.body,
    lineHeight: typography.lineHeight,
  },
  title: {
    fontSize: typography.title,
    fontWeight: typography.fontWeight.bold,
  },
});
