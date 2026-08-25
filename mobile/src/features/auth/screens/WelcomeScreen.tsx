import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppText } from "../../../components/AppText";
import { Screen } from "../../../components/Screen";
import { useTranslation } from "../../../i18n";
import type { AuthStackParamList } from "../../../navigation/types";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.container}>
        {/* Brand Logo & Icon */}
        <View style={styles.brandSection}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.background.surfaceVariant },
            ]}
          >
            <MaterialIcons
              color={colors.brand.primary}
              name="explore"
              size={36}
            />
          </View>
          <Text style={[styles.brandTitle, { color: colors.brand.primary }]}>
            {t("auth.welcome.brand")}
          </Text>
        </View>

        {/* Hero Copy */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.text.primary }]}>
            {t("auth.welcome.title")}
          </Text>
          <AppText style={styles.heroSubtitle}>
            {t("auth.welcome.subtitle")}
          </AppText>
        </View>

        {/* CTA Actions */}
        <View style={styles.actionSection}>
          <Pressable
            accessibilityHint={t("auth.welcome.getStarted")}
            accessibilityLabel={t("auth.welcome.getStarted")}
            accessibilityRole="button"
            onPress={() => navigation.navigate("Register")}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.brand.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.primaryButtonText, { color: colors.text.inverse }]}
            >
              {t("auth.welcome.getStarted")}
            </Text>
            <MaterialIcons
              color={colors.text.inverse}
              name="arrow-forward"
              size={18}
            />
          </Pressable>

          <Pressable
            accessibilityHint={t("auth.welcome.signIn")}
            accessibilityLabel={t("auth.welcome.signIn")}
            accessibilityRole="button"
            onPress={() => navigation.navigate("Login")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { backgroundColor: colors.background.surfaceVariant },
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.brand.primary },
              ]}
            >
              {t("auth.welcome.signIn")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    width: "100%",
  },
  brandSection: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 64,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 64,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
    maxWidth: 320,
  },
  heroTitle: {
    fontSize: typography.title,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: "center",
  },
  actionSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
    width: "100%",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    elevation: 2,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: "100%",
  },
  primaryButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: radius.pill,
    justifyContent: "center",
    paddingVertical: 14,
    width: "100%",
  },
  secondaryButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
