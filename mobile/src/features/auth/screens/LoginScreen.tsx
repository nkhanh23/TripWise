import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import type { AuthStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { useAuth } from '../AuthProvider';
import { authErrorTranslationKey } from '../authErrors';
import { validateLogin } from '../validation';
import { AuthScreenLayout } from './AuthScreenLayout';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const validationError = validateLogin({ email, password });
    if (validationError) {
      setErrorMessage(t(validationError));
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setErrorMessage(t(authErrorTranslationKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout>
      {/* Top App Bar with Back Button & Branding */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityHint="Quay lại màn hình trước"
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Welcome'))}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { backgroundColor: colors.background.surfaceVariant },
          ]}>
          <MaterialIcons color={colors.text.primary} name="arrow-back" size={20} />
        </Pressable>
        <Text style={[styles.topBarBrand, { color: colors.brand.primary }]}>
          {t('auth.welcome.brand')}
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      {/* Header Section */}
      <View style={styles.headingSection}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t('auth.login.title')}
        </Text>
        <AppText style={styles.subtitle}>
          {t('auth.login.subtitle')}
        </AppText>
      </View>

      {/* Form Section */}
      <View style={styles.formContainer}>
        {/* Demo Account Quick Fill Banner */}
        <Pressable
          accessibilityHint={t('auth.login.demoSubtitle')}
          accessibilityLabel={t('auth.login.demoTitle')}
          accessibilityRole="button"
          onPress={() => {
            setEmail('sarah.j@example.com');
            setPassword('password123');
            if (errorMessage) setErrorMessage(null);
          }}
          style={({ pressed }) => [
            styles.demoBanner,
            {
              backgroundColor: colors.background.surfaceVariant,
              borderColor: colors.border.default,
            },
            pressed && styles.demoBannerPressed,
          ]}>
          <MaterialIcons color={colors.brand.primary} name="flash-on" size={20} />
          <View style={styles.demoBannerContent}>
            <Text style={[styles.demoBannerTitle, { color: colors.text.primary }]}>
              {t('auth.login.demoTitle')}
            </Text>
            <Text style={[styles.demoBannerEmail, { color: colors.text.muted }]}>
              sarah.j@example.com • password123
            </Text>
          </View>
          <MaterialIcons color={colors.brand.primary} name="touch-app" size={18} />
        </Pressable>

        {/* Email Field */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t('auth.login.email')}
          </Text>
          <TextInput
            accessibilityHint="Nhập địa chỉ email đăng nhập của bạn"
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={t('auth.login.emailPlaceholder')}
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

        {/* Password Field */}
        <View style={styles.formGroup}>
          <View style={styles.passwordLabelRow}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              {t('auth.login.password')}
            </Text>
            <Pressable
              accessibilityHint="Chuyển đến màn hình đặt lại mật khẩu"
              accessibilityLabel="Quên mật khẩu"
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={[styles.forgotPasswordText, { color: colors.brand.primary }]}>
                {t('auth.login.forgotPassword')}
              </Text>
            </Pressable>
          </View>
          <View
            style={[
              styles.passwordInputWrapper,
              { backgroundColor: colors.background.surfaceVariant },
            ]}>
            <TextInput
              accessibilityHint="Nhập mật khẩu của bạn"
              accessibilityLabel="Mật khẩu"
              autoCapitalize="none"
              autoComplete="current-password"
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t('auth.login.passwordPlaceholder')}
              placeholderTextColor={colors.text.muted}
              secureTextEntry={!showPassword}
              style={[styles.passwordInput, { color: colors.text.primary }]}
              value={password}
            />
            <Pressable
              accessibilityHint="Bật hoặc tắt hiển thị mật khẩu"
              accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.passwordToggle}>
              <Text style={[styles.passwordToggleText, { color: colors.brand.primary }]}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Error Alert */}
        {errorMessage ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.errorContainer,
              { backgroundColor: effectiveTheme === 'dark' ? '#3B1E1E' : '#FDE8E8' },
            ]}>
            <Text style={[styles.errorText, { color: colors.state.error }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <Pressable
          accessibilityHint="Nhấn để đăng nhập vào ứng dụng"
          accessibilityLabel="Đăng nhập"
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.brand.primary },
            submitting && styles.disabledButton,
            pressed && !submitting && styles.buttonPressed,
          ]}>
          {submitting ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>
              {t('auth.login.submit')}
            </Text>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border.subtle }]} />
          <Text style={[styles.dividerText, { color: colors.text.muted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border.subtle }]} />
        </View>

        {/* Social Login Button */}
        <Pressable
          accessibilityHint="Đăng nhập bằng tài khoản Google"
          accessibilityLabel="Tiếp tục với Google"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.socialButton,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
            pressed && { backgroundColor: colors.background.surfaceVariant },
          ]}>
          <Text style={[styles.socialIconText, { color: colors.brand.primary }]}>G</Text>
          <Text style={[styles.socialButtonText, { color: colors.text.primary }]}>
            Continue with Google
          </Text>
        </Pressable>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <AppText style={styles.footerText}>{t('auth.login.noAccount') + ' '}</AppText>
          <Pressable
            accessibilityHint="Chuyển đến màn hình tạo tài khoản"
            accessibilityLabel="Đăng ký tài khoản"
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.footerLink, { color: colors.brand.primary }]}>
              {t('auth.login.registerPrompt')}
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  topBarBrand: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  topBarSpacer: {
    width: 40,
  },
  headingSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: 'center',
  },
  formContainer: {
    gap: spacing.md,
    width: '100%',
  },
  demoBanner: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  demoBannerPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  demoBannerContent: {
    flex: 1,
  },
  demoBannerTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  demoBannerEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  formGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  passwordLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forgotPasswordText: {
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
    alignItems: 'center',
    borderRadius: radius.input,
    flexDirection: 'row',
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
  errorContainer: {
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 2,
    height: 48,
    justifyContent: 'center',
    marginTop: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: '100%',
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  socialButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  footerText: {
    fontSize: typography.bodySmall,
  },
  footerLink: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
