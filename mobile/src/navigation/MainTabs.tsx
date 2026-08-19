import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ExploreScreen } from '../features/explore/ExploreScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PlanScreen } from '../features/planner/PlanScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { TripsScreen } from '../features/trips/TripsScreen';
import { colors } from '../theme/tokens';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: { backgroundColor: colors.background.surface },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explore' }} />
      <Tab.Screen name="Plan" component={PlanScreen} options={{ title: 'Plan Trip' }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ title: 'My Trips' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
