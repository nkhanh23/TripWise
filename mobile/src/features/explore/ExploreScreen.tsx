import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';
import { spacing, radius, colors } from '../../theme/tokens';
import type { ExplorePlacesRepository } from '../../integration/repositories';
import { ExploreCategoryChips } from './components/ExploreCategoryChips';
import { ExploreEmptyState } from './components/ExploreEmptyState';
import { ExploreErrorState } from './components/ExploreErrorState';
import { ExploreMapCanvas } from './components/ExploreMapCanvas';
import { ExplorePlaceList } from './components/ExplorePlaceList';
import { ExplorePlacePreview } from './components/ExplorePlacePreview';
import { ExploreSearchBar } from './components/ExploreSearchBar';
import { ExploreViewToggle } from './components/ExploreViewToggle';
import { clusterPlaces } from './helpers/clustering';
import { useExploreDiscovery } from './hooks/useExploreDiscovery';
import type {
  ClusterMarkerModel,
  ExploreCategory,
  ExploreMapPlace,
  ExplorePlace,
  ExploreUIStatus,
  ExploreViewMode,
} from './types';

type Props = {
  initialStatus?: ExploreUIStatus;
  initialPlaces?: ExplorePlace[];
  initialViewMode?: ExploreViewMode;
  onNavigatePlaceDetail?: (placeId: string) => void;
  repository?: ExplorePlacesRepository;
};

export function ExploreScreen({
  initialStatus = 'ready',
  initialPlaces,
  initialViewMode = 'map',
  onNavigatePlaceDetail,
  repository,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [viewMode, setViewMode] = useState<ExploreViewMode>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const {
    places,
    status: networkStatus,
    category: selectedCategory,
    confirmedCategory,
    hasBackgroundError,
    setCategory: setSelectedCategory,
    onRegionChangeComplete,
    retry,
  } = useExploreDiscovery(repository, initialPlaces, initialStatus);

  const normalizedStatus = normalizeStatus(networkStatus);
  const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;
  const hasUsablePlaces = places.length > 0;
  const showBlockingError = normalizedStatus === 'error' && !hasUsablePlaces;
  const showConfirmedCategory = normalizedStatus === 'refreshing' || hasBackgroundError;
  const displayCategory = showConfirmedCategory ? confirmedCategory : selectedCategory;
  const markersDimmed = confirmedCategory !== selectedCategory && (normalizedStatus === 'refreshing' || hasBackgroundError);

  // Top header height calculation for List mode padding
  const topControlsHeight = Math.max(insets.top, spacing.md) + 50 + 46;

  // Filter places based on category and search query
  const filteredPlaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return places.filter((place) => {
      const matchesCategory =
        displayCategory === 'all' || place.category === displayCategory;

      const matchesSearch =
        query === '' ||
        place.name.toLowerCase().includes(query) ||
        (place.address?.toLowerCase().includes(query) ?? false) ||
        place.categoryLabel.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [places, selectedCategory, searchQuery]);

  // Generate marker models (single place and clusters) for map canvas
  const markerItems = useMemo(() => {
    return clusterPlaces(filteredPlaces);
  }, [filteredPlaces]);

  // Find currently selected place object
  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return filteredPlaces.find((p) => p.id === selectedPlaceId) ?? null;
  }, [filteredPlaces, selectedPlaceId]);

  const handleSelectPlace = useCallback((place: ExploreMapPlace) => {
    setSelectedPlaceId(place.id);
  }, []);

  const handleSelectCluster = useCallback((cluster: ClusterMarkerModel) => {
    if (cluster.places.length > 0) {
      setSelectedPlaceId(cluster.places[0].id);
    }
  }, []);

  const handleDismissSelection = useCallback(() => {
    setSelectedPlaceId(null);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleSelectCategory = useCallback((category: ExploreCategory) => {
    setSelectedCategory(category);
    setSelectedPlaceId(null);
  }, [setSelectedCategory]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPlaceId(null);
  }, [setSelectedCategory]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'map' ? 'list' : 'map'));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
      {/* 1. Main View (Map Canvas or Virtualized List) */}
      {viewMode === 'map' ? (
        <ExploreMapCanvas
          markerItems={markerItems}
          markersDimmed={markersDimmed}
          onDismissSelection={handleDismissSelection}
          onMovementStateChange={setIsMapMoving}
          onSelectCluster={handleSelectCluster}
          onSelectPlace={handleSelectPlace}
          onRegionChangeComplete={onRegionChangeComplete}
          selectedPlaceId={selectedPlaceId}
          status={effectiveStatus}
        />
      ) : (
        <ExplorePlaceList
          onSelectPlace={handleSelectPlace}
          places={filteredPlaces}
          selectedPlaceId={selectedPlaceId}
          topPadding={topControlsHeight}
        />
      )}

      {/* 2. Top Floating Controls (Search Bar & Category Chips) */}
      <View style={[styles.topControls, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <ExploreSearchBar
          onClear={handleClearSearch}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
        />
        <ExploreCategoryChips
          onSelectCategory={handleSelectCategory}
          selectedCategory={selectedCategory}
        />
      </View>

      {/* 3. Floating View Mode Toggle (Map / List) */}
      {normalizedStatus === 'ready' && filteredPlaces.length > 0 ? (
        <ExploreViewToggle onToggle={handleToggleViewMode} viewMode={viewMode} />
      ) : null}

      {/* 4. Loading State */}
      {normalizedStatus === 'initial-loading' ? (
        <View
          accessibilityLabel="Đang tải dữ liệu bản đồ"
          accessibilityRole="progressbar"
          style={[styles.loadingOverlay, { backgroundColor: colors.overlay.scrim }]}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : null}

      {/* 5. Error State */}
      {showBlockingError ? <ExploreErrorState onRetry={handleRetry} /> : null}

      {hasBackgroundError && hasUsablePlaces ? (
        <View style={styles.backgroundErrorWrap}>
          <Pressable
            accessibilityHint="Thử tải lại dữ liệu địa điểm"
            accessibilityLabel="Thử lại tải dữ liệu bản đồ"
            accessibilityRole="button"
            onPress={handleRetry}
            style={[
              styles.backgroundErrorButton,
              {
                backgroundColor: colors.background.surface,
                borderColor: colors.border.default,
              },
            ]}>
            <MaterialIcons color={colors.state.error} name="refresh" size={18} />
          </Pressable>
        </View>
      ) : null}

      {/* 6. Empty State when filter has no matches */}
      {normalizedStatus === 'ready' && filteredPlaces.length === 0 && !hasBackgroundError ? (
        <ExploreEmptyState onReset={handleResetFilters} />
      ) : null}

      {/* 7. Selected Place Bottom Preview Sheet */}
      {normalizedStatus === 'ready' && selectedPlace ? (
        <ExplorePlacePreview
          onClose={handleDismissSelection}
          onPressDetail={onNavigatePlaceDetail}
          place={selectedPlace}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControls: {
    gap: spacing.xs,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  refreshIndicatorWrap: {
    alignItems: 'center',
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xl * 4,
    zIndex: 25,
  },
  refreshIndicator: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 3,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backgroundErrorWrap: {
    alignItems: 'center',
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xl * 4,
    zIndex: 26,
  },
  backgroundErrorButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 3,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  loadingOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
});


function normalizeStatus(status: ExploreUIStatus): ExploreUIStatus {
  if (status === 'moving') return 'ready';
  return status;
}
