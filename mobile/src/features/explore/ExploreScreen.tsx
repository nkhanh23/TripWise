import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';
import { spacing } from '../../theme/tokens';
import { ExploreCategoryChips } from './components/ExploreCategoryChips';
import { ExploreEmptyState } from './components/ExploreEmptyState';
import { ExploreErrorState } from './components/ExploreErrorState';
import { ExploreMapCanvas } from './components/ExploreMapCanvas';
import { ExplorePlaceList } from './components/ExplorePlaceList';
import { ExplorePlacePreview } from './components/ExplorePlacePreview';
import { ExploreSearchBar } from './components/ExploreSearchBar';
import { ExploreViewToggle } from './components/ExploreViewToggle';
import { clusterPlaces } from './helpers/clustering';
import type {
  ClusterMarkerModel,
  ExploreCategory,
  ExplorePlace,
  ExploreUIStatus,
  ExploreViewMode,
} from './types';

type Props = {
  initialStatus?: ExploreUIStatus;
  initialPlaces?: ExplorePlace[];
  initialViewMode?: ExploreViewMode;
  onNavigatePlaceDetail?: (placeId: string) => void;
};

export function ExploreScreen({
  initialStatus = 'ready',
  initialPlaces = [],
  initialViewMode = 'map',
  onNavigatePlaceDetail,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [status, setStatus] = useState<ExploreUIStatus>(initialStatus);
  const [viewMode, setViewMode] = useState<ExploreViewMode>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExploreCategory>('all');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Top header height calculation for List mode padding
  const topControlsHeight = Math.max(insets.top, spacing.md) + 50 + 46;

  // Filter places based on category and search query
  const filteredPlaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return initialPlaces.filter((place) => {
      const matchesCategory =
        selectedCategory === 'all' || place.category === selectedCategory;

      const matchesSearch =
        query === '' ||
        place.name.toLowerCase().includes(query) ||
        place.address.toLowerCase().includes(query) ||
        place.categoryLabel.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [initialPlaces, selectedCategory, searchQuery]);

  // Generate marker models (single place and clusters) for map canvas
  const markerItems = useMemo(() => {
    return clusterPlaces(filteredPlaces);
  }, [filteredPlaces]);

  // Find currently selected place object
  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return filteredPlaces.find((p) => p.id === selectedPlaceId) ?? null;
  }, [filteredPlaces, selectedPlaceId]);

  const handleSelectPlace = useCallback((place: ExplorePlace) => {
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
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPlaceId(null);
    setStatus('ready');
  }, []);

  const handleRetry = useCallback(() => {
    setStatus('ready');
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'map' ? 'list' : 'map'));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
      {/* 1. Main View (Map Canvas or Virtualized List) */}
      {viewMode === 'map' ? (
        <ExploreMapCanvas
          markerItems={markerItems}
          onDismissSelection={handleDismissSelection}
          onSelectCluster={handleSelectCluster}
          onSelectPlace={handleSelectPlace}
          selectedPlaceId={selectedPlaceId}
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
      {status === 'ready' && filteredPlaces.length > 0 ? (
        <ExploreViewToggle onToggle={handleToggleViewMode} viewMode={viewMode} />
      ) : null}

      {/* 4. Loading State */}
      {status === 'loading' ? (
        <View
          accessibilityLabel="Đang tải dữ liệu bản đồ"
          accessibilityRole="progressbar"
          style={[styles.loadingOverlay, { backgroundColor: colors.overlay.scrim }]}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : null}

      {/* 5. Error State */}
      {status === 'error' ? <ExploreErrorState onRetry={handleRetry} /> : null}

      {/* 6. Empty State when filter has no matches */}
      {status === 'ready' && filteredPlaces.length === 0 ? (
        <ExploreEmptyState onReset={handleResetFilters} />
      ) : null}

      {/* 7. Selected Place Bottom Preview Sheet */}
      {status === 'ready' && selectedPlace ? (
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
