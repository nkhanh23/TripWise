import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ExploreScreen } from '../features/explore/ExploreScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PlanScreen } from '../features/planner/PlanScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { TripsScreen } from '../features/trips/TripsScreen';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';
import type { MainTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function ExploreTabScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <ExploreScreen
      onNavigatePlaceDetail={(placeId) => navigation.navigate('PlaceDetail', { placeId })}
    />
  );
}

export function MainTabs() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.background.surface,
          borderTopColor: colors.border.default,
        },
      }}>
      <Tab.Screen
        component={HomeScreen}
        name="Home"
        options={{
          title: t('navigation.tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="home" size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={ExploreTabScreen}
        name="Explore"
        options={{
          title: t('navigation.tabs.explore'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="explore" size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={PlanScreen}
        name="Plan"
        options={{
          title: t('navigation.tabs.plan'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="add-circle-outline" size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={TripsScreen}
        name="Trips"
        options={{
          title: t('navigation.tabs.trips'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="map" size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={ProfileScreen}
        name="Profile"
        options={{
          title: t('navigation.tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="person" size={size ?? 24} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
