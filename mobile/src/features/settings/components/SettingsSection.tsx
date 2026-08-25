import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";

type Props = {
  title: string;
  children: React.ReactNode;
};

export const SettingsSection = memo(function SettingsSection({
  title,
  children,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.brand.primary }]}>
        {title}
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.subtle,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
});
