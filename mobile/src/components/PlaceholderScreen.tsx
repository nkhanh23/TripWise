import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { Screen } from "./Screen";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

type PlaceholderScreenProps = {
  title: string;
};

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const { colors } = useTheme();

  return (
    <Screen>
      <View
        accessibilityRole="header"
        style={[
          styles.card,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <AppText variant="title">{title}</AppText>
        <AppText>Mobile foundation placeholder</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 2,
    gap: spacing.sm,
    padding: spacing.lg,
  },
});
