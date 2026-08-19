import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getSupabaseConfig } from '../lib/supabase/config';
import { MainTabs } from '../navigation/MainTabs';

export function AppRoot() {
  getSupabaseConfig();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MainTabs />
    </SafeAreaProvider>
  );
}
