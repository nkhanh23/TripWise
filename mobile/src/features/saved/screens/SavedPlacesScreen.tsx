import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../../../i18n';
import type { PlacePhotoRepository, SavedPlacesRepository } from '../../../integration/repositories';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { ExploreCategory } from '../../explore/types';
import { SavedCategoryChips } from '../components/SavedCategoryChips';
import { SavedEmptyState } from '../components/SavedEmptyState';
import { SavedPlaceCard } from '../components/SavedPlaceCard';
import { SavedUndoBar } from '../components/SavedUndoBar';
import { useSavedPlaces } from '../hooks/useSavedPlaces';
import type { SavedPlaceUIItem } from '../types';

type CombinedNavProp = NativeStackNavigationProp<RootStackParamList> &
  BottomTabNavigationProp<MainTabParamList>;

type Props = {
  customPlaces?: (SavedPlaceUIItem | any)[];
  repository?: SavedPlacesRepository;
  photoRepository?: PlacePhotoRepository;
  fixtureMode?: boolean;
};

export const SavedPlacesScreen = memo(function SavedPlacesScreen({
  customPlaces,
  repository,
  photoRepository,
  fixtureMode,
}: Props) {
  const navigation = useNavigation<CombinedNavProp>();
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const isFixture = Boolean(fixtureMode || customPlaces);

  const {
    savedPlaces,
    status,
    handleUnsave,
    handleUndo,
    dismissUndo,
    lastRemovedPlace,
    refresh,
  } = useSavedPlaces({
    repository,
    photoRepository,
    customPlaces,
    fixtureMode: isFixture,
  });

  const [selectedCategory, setSelectedCategory] = useState<ExploreCategory>('all');

  // Filter places based on selected category
  const filteredPlaces = useMemo(() => {
    if (selectedCategory === 'all') {
      return savedPlaces;
    }
    return savedPlaces.filter((p) => p.category === selectedCategory);
  }, [savedPlaces, selectedCategory]);

  const handleNavigatePlaceDetail = useCallback(
    (placeId: string) => {
      // Only route to PlaceDetail if it's a fixture ID; real Google Places don't have rich details yet
      if (placeId.startsWith('place_')) {
        navigation.navigate('PlaceDetail', { placeId });
      }
    },
    [navigation]
  );

  const handleExplore = useCallback(() => {
    navigation.navigate('Explore');
  }, [navigation]);

  const handleShowAll = useCallback(() => {
    setSelectedCategory('all');
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Explore');
    }
  }, [navigation]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* 1. Page Title */}
      <View style={styles.titleRow}>
        <Text
          style={[
            styles.pageTitle,
            { color: colors.text.primary },
          ]}>
          {t('savedPlaces.title')}
        </Text>
        <Text
          style={[
            styles.countBadge,
            {
              backgroundColor: colors.background.surfaceVariant,
              color: colors.brand.primary,
            },
          ]}>
          {savedPlaces.length}
        </Text>
      </View>

      {/* 2. Category Filter Chips (Hidden if globally empty) */}
      {savedPlaces.length > 0 ? (
        <SavedCategoryChips
          onSelectCategory={setSelectedCategory}
          selectedCategory={selectedCategory}
        />
      ) : null}
    </View>
  );

  const isGloballyEmpty = status === 'empty' || (status === 'ready' && savedPlaces.length === 0);
  const isFilteredEmpty = !isGloballyEmpty && filteredPlaces.length === 0;

  const keyExtractor = useCallback((item: SavedPlaceUIItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: SavedPlaceUIItem }) => (
      <SavedPlaceCard
        isSaved
        onPress={handleNavigatePlaceDetail}
        onToggleSave={handleUnsave}
        place={item}
      />
    ),
    [handleNavigatePlaceDetail, handleUnsave]
  );

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background.canvas,
          paddingTop: insets.top,
        },
      ]}>
      {/* 1. Top App Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor:
              effectiveTheme === 'dark'
                ? 'rgba(19, 20, 24, 0.95)'
                : 'rgba(252, 249, 248, 0.95)',
            borderBottomColor: colors.border.subtle,
          },
        ]}>
        {navigation.canGoBack() ? (
          <Pressable
            accessibilityHint="Go back"
            accessibilityLabel="Back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleBack}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor:
                  effectiveTheme === 'dark'
                    ? 'rgba(30, 31, 36, 0.9)'
                    : 'rgba(255, 255, 255, 0.9)',
              },
              pressed && styles.pressed,
            ]}>
            <MaterialIcons color={colors.brand.primary} name="arrow-back" size={22} />
          </Pressable>
        ) : (
          <View style={styles.placeholderIcon} />
        )}

        <Text style={[styles.brandText, { color: colors.brand.primary }]}>
          TripWise
        </Text>

        <Pressable
          accessibilityHint="Explore more places"
          accessibilityLabel="Search"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleExplore}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(30, 31, 36, 0.9)'
                  : 'rgba(255, 255, 255, 0.9)',
            },
            pressed && styles.pressed,
          ]}>
          <MaterialIcons color={colors.brand.primary} name="search" size={22} />
        </Pressable>
      </View>

      {/* 2. Loading State */}
      {status === 'loading' ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : status === 'error' ? (
        /* Error State with Retry */
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Unable to load saved places
          </Text>
          <Pressable
            onPress={refresh}
            style={[styles.retryButton, { backgroundColor: colors.brand.primary }]}>
            <Text style={[styles.retryText, { color: colors.text.inverse }]}>Retry</Text>
          </Pressable>
        </View>
      ) : isGloballyEmpty ? (
        /* Empty State */
        <SavedEmptyState onExplore={handleExplore} />
      ) : (
        /* Populated List */
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          data={filteredPlaces}
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            isFilteredEmpty ? (
              <SavedEmptyState
                isFiltered
                onExplore={handleExplore}
                onShowAll={handleShowAll}
              />
            ) : null
          }
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
        />
      )}

      {/* 3. Undo Floating Snackbar */}
      <SavedUndoBar
        onDismiss={dismissUndo}
        onUndo={handleUndo}
        removedPlace={lastRemovedPlace as any}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  placeholderIcon: {
    height: 38,
    width: 38,
  },
  brandText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  headerContainer: {
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pageTitle: {
    fontSize: typography.title,
    fontWeight: typography.fontWeight.bold,
  },
  countBadge: {
    borderRadius: radius.pill,
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  listContent: {
    flexGrow: 1,
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.7,
  },
});
