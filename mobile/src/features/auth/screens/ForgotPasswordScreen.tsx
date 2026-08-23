import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import type { AuthStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { useAuth } from '../AuthProvider';
import { authErrorTranslationKey } from '../authErrors';
import { AuthScreenLayout } from './AuthScreenLayout';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!emailPattern.test(email.trim())) {
      setErrorMessage(t('auth.validation.invalidEmail'));
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await resetPassword(email);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(t(authErrorTranslationKey(error)));
    } finally {
      setSubmitting(false);
    }
  }, [email, resetPassword, t]);

  const handleReset = useCallback(() => {
    setIsSuccess(false);
    setEmail('');
    navigation.navigate('Login');
  }, [navigation]);

  return (
    <AuthScreenLayout>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityHint="Quay lại màn hình đăng nhập"
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login'))}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { backgroundColor: colors.background.surfaceVariant },
          ]}>
          <MaterialIcons color={colors.text.primary} name="arrow-back" size={20} />
        </Pressable>
      </View>

      {!isSuccess ? (
        /* Form State */
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
          ]}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.background.surfaceVariant },
              ]}>
              <MaterialIcons color={colors.brand.primary} name="lock-reset" size={28} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {t('auth.forgotPassword.title')}
            </Text>
            <AppText style={styles.subtitle}>
              {t('auth.forgotPassword.subtitle')}
            </AppText>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              {t('auth.forgotPassword.email')}
            </Text>
            <TextInput
              accessibilityHint="Nhập địa chỉ email để nhận liên kết đặt lại mật khẩu"
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="name@example.com"
              placeholderTextColor={colors.text.muted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background.surfaceVariant,
                  borderColor: colors.border.default,
                  color: colors.text.primary,
                },
              ]}
              value={email}
            />
          </View>

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

          <Pressable
            accessibilityHint="Gửi liên kết đặt lại mật khẩu đến email đã nhập"
            accessibilityLabel="Gửi liên kết đặt lại mật khẩu"
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void handleSubmit()}
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
                {t('auth.forgotPassword.submit')}
              </Text>
            )}
          </Pressable>
        </View>
      ) : (
        /* Success State */
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
          ]}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: effectiveTheme === 'dark' ? '#1E3B22' : '#E2F0D9' },
              ]}>
              <MaterialIcons color={colors.brand.primary} name="mark-email-read" size={28} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {t('auth.forgotPassword.checkEmailTitle')}
            </Text>
            <AppText style={styles.subtitle}>
              {t('auth.forgotPassword.checkEmailSubtitle')}
            </AppText>
          </View>

          <Pressable
            accessibilityHint="Quay lại màn hình đăng nhập"
            accessibilityLabel="Quay lại đăng nhập"
            accessibilityRole="button"
            onPress={handleReset}
            style={({ pressed }) => [styles.secondaryActionButton, pressed && styles.buttonPressed]}>
            <MaterialIcons color={colors.brand.primary} name="arrow-back" size={16} />
            <Text style={[styles.secondaryActionButtonText, { color: colors.brand.primary }]}>
              {t('auth.forgotPassword.backToLogin')}
            </Text>
          </Pressable>
        </View>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardContainer: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 56,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
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
    borderWidth: 1,
    fontSize: typography.bodySmall,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  errorContainer: {
    borderRadius: radius.input,
    padding: spacing.md,
  },
  errorText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryActionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryActionButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
