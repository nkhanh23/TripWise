import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { colors, radius, spacing } from '../../../theme/tokens';
import type { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../AuthProvider';
import { mapAuthError } from '../authErrors';
import { validateRegistration } from '../validation';
import { AuthScreenLayout } from './AuthScreenLayout';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const validationError = validateRegistration({ displayName, email, password, confirmPassword });
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await signUp(displayName, email, password);
      if (result.confirmationRequired) {
        setMessage('Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận trước khi đăng nhập.');
      }
    } catch (error) {
      setMessage(mapAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout>
      <View style={styles.heading}>
        <AppText variant="title">Tạo tài khoản</AppText>
        <AppText>Bắt đầu lập kế hoạch du lịch cá nhân.</AppText>
      </View>
      <TextInput autoComplete="name" onChangeText={setDisplayName} placeholder="Tên hiển thị" style={styles.input} value={displayName} />
      <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" style={styles.input} value={email} />
      <TextInput autoComplete="new-password" onChangeText={setPassword} placeholder="Mật khẩu (ít nhất 8 ký tự)" secureTextEntry style={styles.input} value={password} />
      <TextInput autoComplete="new-password" onChangeText={setConfirmPassword} placeholder="Xác nhận mật khẩu" secureTextEntry style={styles.input} value={confirmPassword} />
      {message ? <AppText>{message}</AppText> : null}
      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[styles.primaryButton, submitting && styles.disabled]}>
        <AppText>{submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
        <AppText>Đã có tài khoản? Đăng nhập</AppText>
      </Pressable>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm, marginBottom: spacing.md },
  input: { backgroundColor: colors.background.surface, borderColor: colors.border, borderRadius: radius.control, borderWidth: 1, color: colors.text.primary, fontSize: 16, padding: spacing.md },
  primaryButton: { alignItems: 'center', backgroundColor: colors.brand.primary, borderColor: colors.border, borderRadius: radius.control, borderWidth: 1, padding: spacing.md },
  linkButton: { alignItems: 'center', padding: spacing.sm },
  disabled: { opacity: 0.6 },
});
