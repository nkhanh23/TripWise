import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { colors, radius, spacing } from '../../../theme/tokens';
import type { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../AuthProvider';
import { mapAuthError } from '../authErrors';
import { validateLogin } from '../validation';
import { AuthScreenLayout } from './AuthScreenLayout';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const validationError = validateLogin({ email, password });
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setMessage(mapAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout>
      <View style={styles.heading}>
        <AppText variant="title">Chào mừng trở lại</AppText>
        <AppText>Đăng nhập để tiếp tục kế hoạch chuyến đi của bạn.</AppText>
      </View>
      <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" style={styles.input} value={email} />
      <TextInput autoComplete="current-password" onChangeText={setPassword} placeholder="Mật khẩu" secureTextEntry style={styles.input} value={password} />
      {message ? <AppText>{message}</AppText> : null}
      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[styles.primaryButton, submitting && styles.disabled]}>
        <AppText>{submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
        <AppText>Chưa có tài khoản? Đăng ký</AppText>
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
