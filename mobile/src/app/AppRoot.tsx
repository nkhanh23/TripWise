import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MainTabs } from '../navigation/MainTabs';

export function AppRoot() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MainTabs />
    </SafeAreaProvider>
  );
}
