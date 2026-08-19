import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { useAuth } from '../features/auth/AuthProvider';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import { colors, spacing } from '../theme/tokens';
import { MainTabs } from './MainTabs';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

function AuthBootstrapScreen() {
  return (
    <Screen>
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand.primary} />
        <AppText>Đang kiểm tra phiên đăng nhập…</AppText>
      </View>
    </Screen>
  );
}

function RootContent() {
  const { status } = useAuth();
  if (status === 'loading') {
    return <AuthBootstrapScreen />;
  }
  if (status === 'authenticated') {
    return <MainTabs />;
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  return <NavigationContainer><RootContent /></NavigationContainer>;
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: spacing.md },
});
