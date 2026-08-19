import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Screen } from './Screen';
import { colors, radius, spacing } from '../theme/tokens';

type PlaceholderScreenProps = {
  title: string;
};

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View accessibilityRole="header" style={styles.card}>
        <AppText variant="title">{title}</AppText>
        <AppText>Mobile foundation placeholder</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 2,
    gap: spacing.sm,
    padding: spacing.lg,
  },
});
