import type { PropsWithChildren } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

export function Screen({ children }: PropsWithChildren) {
  const { colors, effectiveTheme } = useTheme();

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background.canvas }]}
    >
      <StatusBar
        backgroundColor={colors.background.canvas}
        barStyle={effectiveTheme === "dark" ? "light-content" : "dark-content"}
      />
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
});
