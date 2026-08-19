import type { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '../theme/tokens';

type AppTextProps = PropsWithChildren<{
  variant?: 'body' | 'title';
}>;

export function AppText({ children, variant = 'body' }: AppTextProps) {
  return <Text style={variant === 'title' ? styles.title : styles.body}>{children}</Text>;
}

const styles = StyleSheet.create({
  body: { color: colors.text.secondary, fontSize: typography.body, lineHeight: typography.lineHeight },
  title: { color: colors.text.primary, fontSize: typography.title, fontWeight: typography.fontWeight.bold },
});
