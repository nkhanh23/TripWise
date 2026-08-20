import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { useAuth } from '../features/auth/AuthProvider';
import { ForgotPasswordScreen } from '../features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import { WelcomeScreen } from '../features/auth/screens/WelcomeScreen';
import { PlaceDetailScreen } from '../features/place/screens/PlaceDetailScreen';
import { CreateTripWizardScreen } from '../features/planner/screens/CreateTripWizardScreen';
import { RoutePreviewScreen } from '../features/route/screens/RoutePreviewScreen';
import { TripDetailScreen } from '../features/trips/screens/TripDetailScreen';
import { TranslationProvider, useTranslation } from '../i18n';
import { getNavigationTheme, ThemeProvider, useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { MainTabs } from './MainTabs';
import type { AuthStackParamList, RootStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<RootStackParamList>();

function AuthBootstrapScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand.primary} />
        <AppText>{t('common.loading')}</AppText>
      </View>
    </Screen>
  );
}

function AuthenticatedNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen component={MainTabs} name="MainTabs" />
      <AppStack.Screen component={PlaceDetailScreen} name="PlaceDetail" />
      <AppStack.Screen component={RoutePreviewScreen} name="RoutePreview" />
      <AppStack.Screen component={CreateTripWizardScreen} name="CreateTripWizard" />
      <AppStack.Screen component={TripDetailScreen} name="TripDetail" />
    </AppStack.Navigator>
  );
}

function RootContent() {
  const { status } = useAuth();
  if (status === 'loading') {
    return <AuthBootstrapScreen />;
  }
  if (status === 'authenticated') {
    return <AuthenticatedNavigator />;
  }
  return (
    <AuthStack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen component={WelcomeScreen} name="Welcome" />
      <AuthStack.Screen component={LoginScreen} name="Login" />
      <AuthStack.Screen component={RegisterScreen} name="Register" />
      <AuthStack.Screen component={ForgotPasswordScreen} name="ForgotPassword" />
    </AuthStack.Navigator>
  );
}

function ThemedNavigationContainer() {
  const { colors, effectiveTheme } = useTheme();
  const navTheme = getNavigationTheme(colors, effectiveTheme === 'dark');

  return (
    <NavigationContainer theme={navTheme}>
      <RootContent />
    </NavigationContainer>
  );
}

export function AppNavigator() {
  return (
    <ThemeProvider>
      <TranslationProvider>
        <ThemedNavigationContainer />
      </TranslationProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: spacing.md },
});
