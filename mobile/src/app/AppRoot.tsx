import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getSupabaseConfig } from '../lib/supabase/config';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AppNavigator } from '../navigation/AppNavigator';

export function AppRoot() {
  getSupabaseConfig();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
