import { PlatformPressable } from '@react-navigation/elements';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ExploreScreen } from '../features/explore/ExploreScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PlanScreen } from '../features/planner/PlanScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SavedPlacesScreen } from '../features/saved';
import { TripsScreen } from '../features/trips/TripsScreen';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';
import { supabase } from '../lib/supabase/client';
import { SupabaseExplorePlacesRepository } from '../integration/remote/supabaseExplorePlacesRepository';
import type { MainTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const explorePlacesRepository = new SupabaseExplorePlacesRepository(supabase);

function ExploreTabScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <ExploreScreen
      repository={explorePlacesRepository}
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
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarButton: (props) => <PlatformPressable {...props} pressOpacity={0.6} />,
        tabBarItemStyle: {
          paddingVertical: 2,
        },
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
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons color={color} name="home" size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={ExploreTabScreen}
        name="Explore"
        options={{
          title: t('navigation.tabs.explore'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons color={color} name="explore" size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={PlanScreen}
        name="Plan"
        options={{
          title: t('navigation.tabs.plan'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons color={color} name={focused ? "add-circle" : "add-circle-outline"} size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={TripsScreen}
        name="Trips"
        options={{
          title: t('navigation.tabs.trips'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons color={color} name="map" size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={SavedPlacesScreen}
        name="Saved"
        options={{
          title: t('navigation.tabs.saved'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons color={color} name={focused ? "bookmark" : "bookmark-border"} size={size ?? 24} />
          ),
        }}
      />
      <Tab.Screen
        component={ProfileScreen}
        name="Profile"
        options={{
          title: t('navigation.tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons color={color} name={focused ? "person" : "person-outline"} size={size ?? 24} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

