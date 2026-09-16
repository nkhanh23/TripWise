import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getSupabaseConfig } from '../lib/supabase/config';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AppNavigator } from '../navigation/AppNavigator';
import { startNotificationPolicyRuntime } from '../integration/notificationPolicyRuntime';

export function AppRoot() {
  getSupabaseConfig();
  useEffect(startNotificationPolicyRuntime, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
