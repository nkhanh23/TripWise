import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppText } from "../../../components/AppText";
import { useTranslation } from "../../../i18n";
import type { AuthStackParamList } from "../../../navigation/types";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import { useAuth } from "../AuthProvider";
import { authErrorTranslationKey } from "../authErrors";
import { validateRegistration } from "../validation";
import { AuthScreenLayout } from "./AuthScreenLayout";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const submit = async () => {
    const validationError = validateRegistration({
      displayName,
      email,
      password,
      confirmPassword,
    });
    if (validationError) {
      setStatusMessage({ text: t(validationError), isError: true });
      return;
    }
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const result = await signUp(displayName, email, password);
      if (result.confirmationRequired) {
        setStatusMessage({
          text: t("auth.register.confirmationRequired"),
          isError: false,
        });
      }
    } catch (error) {
      setStatusMessage({
        text: t(authErrorTranslationKey(error)),
        isError: true,
      });
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityHint="Quay lại màn hình trước"
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate("Welcome")
          }
          style={({ pressed }) => [
            styles.backButton,
            pressed && { backgroundColor: colors.background.surfaceVariant },
          ]}
        >
          <MaterialIcons
            color={colors.text.primary}
            name="arrow-back"
            size={24}
          />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text.primary }]}>
          {t("auth.register.title")}
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      {/* Heading Section */}
      <View style={styles.headingSection}>
        <Text style={[styles.brandTitle, { color: colors.brand.primary }]}>
          {t("auth.welcome.brand")}
        </Text>
        <AppText style={styles.subtitle}>{t("auth.register.subtitle")}</AppText>
      </View>

      {/* Form Section */}
      <View style={styles.formContainer}>
        {/* Full Name */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t("auth.register.name")}
          </Text>
          <TextInput
            accessibilityHint="Nhập họ và tên hiển thị của bạn"
            accessibilityLabel="Họ và tên"
            autoComplete="name"
            onChangeText={(text) => {
              setDisplayName(text);
              if (statusMessage) setStatusMessage(null);
            }}
            placeholder={t("auth.register.namePlaceholder")}
            placeholderTextColor={colors.text.muted}
            style={[
              styles.input,
              {
                backgroundColor: colors.background.surfaceVariant,
                color: colors.text.primary,
              },
            ]}
            value={displayName}
          />
        </View>

        {/* Email */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t("auth.register.email")}
          </Text>
          <TextInput
            accessibilityHint="Nhập địa chỉ email đăng ký"
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={(text) => {
              setEmail(text);
              if (statusMessage) setStatusMessage(null);
            }}
            placeholder={t("auth.register.emailPlaceholder")}
            placeholderTextColor={colors.text.muted}
            style={[
              styles.input,
              {
                backgroundColor: colors.background.surfaceVariant,
                color: colors.text.primary,
              },
            ]}
            value={email}
          />
        </View>

        {/* Password */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t("auth.register.password")}
          </Text>
          <View
            style={[
              styles.passwordInputWrapper,
              { backgroundColor: colors.background.surfaceVariant },
            ]}
          >
            <TextInput
              accessibilityHint="Nhập mật khẩu mới ít nhất 8 ký tự"
              accessibilityLabel="Mật khẩu"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={(text) => {
                setPassword(text);
                if (statusMessage) setStatusMessage(null);
              }}
              placeholder={t("auth.register.passwordPlaceholder")}
              placeholderTextColor={colors.text.muted}
              secureTextEntry={!showPassword}
              style={[styles.passwordInput, { color: colors.text.primary }]}
              value={password}
            />
            <Pressable
              accessibilityHint="Bật hoặc tắt hiển thị mật khẩu"
              accessibilityLabel={
                showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
              }
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.passwordToggle}
            >
              <Text
                style={[
                  styles.passwordToggleText,
                  { color: colors.brand.primary },
                ]}
              >
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t("auth.register.confirmPassword")}
          </Text>
          <View
            style={[
              styles.passwordInputWrapper,
              { backgroundColor: colors.background.surfaceVariant },
            ]}
          >
            <TextInput
              accessibilityHint="Nhập lại mật khẩu để xác nhận"
              accessibilityLabel="Xác nhận mật khẩu"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (statusMessage) setStatusMessage(null);
              }}
              placeholder={t("auth.register.confirmPasswordPlaceholder")}
              placeholderTextColor={colors.text.muted}
              secureTextEntry={!showConfirmPassword}
              style={[styles.passwordInput, { color: colors.text.primary }]}
              value={confirmPassword}
            />
            <Pressable
              accessibilityHint="Bật hoặc tắt hiển thị xác nhận mật khẩu"
              accessibilityLabel={
                showConfirmPassword
                  ? "Ẩn xác nhận mật khẩu"
                  : "Hiện xác nhận mật khẩu"
              }
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              style={styles.passwordToggle}
            >
              <Text
                style={[
                  styles.passwordToggleText,
                  { color: colors.brand.primary },
                ]}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Status / Error Message */}
        {statusMessage ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.messageContainer,
              statusMessage.isError
                ? {
                    backgroundColor:
                      effectiveTheme === "dark" ? "#3B1E1E" : "#FDE8E8",
                  }
                : {
                    backgroundColor:
                      effectiveTheme === "dark" ? "#1E3B22" : "#E6F4EA",
                  },
            ]}
          >
            <Text
              style={[
                styles.errorText,
                {
                  color: statusMessage.isError
                    ? colors.state.error
                    : colors.state.success,
                },
              ]}
            >
              {statusMessage.text}
            </Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <Pressable
          accessibilityHint="Nhấn để tạo tài khoản mới"
          accessibilityLabel="Tạo tài khoản"
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.brand.primary },
            submitting && styles.disabledButton,
            pressed && !submitting && styles.buttonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Text
              style={[styles.primaryButtonText, { color: colors.text.inverse }]}
            >
              {t("auth.register.submit")}
            </Text>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: colors.border.subtle },
            ]}
          />
          <Text style={[styles.dividerText, { color: colors.text.muted }]}>
            or
          </Text>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: colors.border.subtle },
            ]}
          />
        </View>

        {/* Social Button */}
        <Pressable
          accessibilityHint="Đăng ký nhanh bằng tài khoản Google"
          accessibilityLabel="Tiếp tục với Google"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.socialButton,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
            pressed && { backgroundColor: colors.background.surfaceVariant },
          ]}
        >
          <Text
            style={[styles.socialIconText, { color: colors.brand.primary }]}
          >
            G
          </Text>
          <Text
            style={[styles.socialButtonText, { color: colors.text.primary }]}
          >
            Continue with Google
          </Text>
        </Pressable>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <AppText style={styles.footerText}>
            {t("auth.register.haveAccount") + " "}
          </AppText>
          <Pressable
            accessibilityHint="Chuyển đến màn hình đăng nhập"
            accessibilityLabel="Đăng nhập"
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={[styles.footerLink, { color: colors.brand.primary }]}>
              {t("auth.register.loginPrompt")}
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    height: 48,
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  backButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  topBarTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.semibold,
  },
  topBarSpacer: {
    width: 40,
  },
  headingSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: "center",
  },
  formContainer: {
    gap: spacing.md,
    width: "100%",
  },
  formGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  input: {
    borderRadius: radius.input,
    fontSize: typography.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  passwordInputWrapper: {
    alignItems: "center",
    borderRadius: radius.input,
    flexDirection: "row",
  },
  passwordInput: {
    flex: 1,
    fontSize: typography.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  passwordToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  passwordToggleText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  messageContainer: {
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: typography.bodySmall,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    elevation: 2,
    height: 48,
    justifyContent: "center",
    marginTop: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: "100%",
  },
  primaryButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  dividerContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    textTransform: "uppercase",
  },
  socialButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    height: 48,
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
  },
  socialIconText: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
  },
  socialButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  footerText: {
    fontSize: typography.bodySmall,
  },
  footerLink: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
