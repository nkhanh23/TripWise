import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTranslation } from '../../i18n';
import type { EventCandidate, EventIntelligenceRepository, EventIntelligenceRequest } from '../../integration/eventIntelligenceContract';
import type { ExplorePlacesRepository } from '../../integration/repositories';
import { EventCandidateCard } from './components/EventCandidateCard';
import { EventEmptyState } from './components/EventEmptyState';
import { EventErrorState } from './components/EventErrorState';
import { EventPreviewSheet } from './components/EventPreviewSheet';
import { ExploreCategoryChips } from './components/ExploreCategoryChips';
import { ExploreEmptyState } from './components/ExploreEmptyState';
import { ExploreErrorState } from './components/ExploreErrorState';
import { ExploreMapCanvas } from './components/ExploreMapCanvas';
import { ExplorePlaceList } from './components/ExplorePlaceList';
import { ExplorePlacePreview } from './components/ExplorePlacePreview';
import { ExploreSearchBar } from './components/ExploreSearchBar';
import { ExploreViewToggle } from './components/ExploreViewToggle';
import { clusterPlaces } from './helpers/clustering';
import { useEventIntelligence } from './hooks/useEventIntelligence';
import { useExploreDiscovery } from './hooks/useExploreDiscovery';
import type {
  ClusterMarkerModel,
  ExploreCategory,
  ExploreMapPlace,
  ExplorePlace,
  ExploreUIStatus,
  ExploreViewMode,
} from './types';

export type ExploreMode = 'places' | 'events';

type Props = {
  initialStatus?: ExploreUIStatus;
  initialPlaces?: ExplorePlace[];
  initialViewMode?: ExploreViewMode;
  initialExploreMode?: ExploreMode;
  initialEventRequest?: EventIntelligenceRequest;
  onNavigatePlaceDetail?: (placeId: string) => void;
  repository?: ExplorePlacesRepository;
  eventRepository?: EventIntelligenceRepository;
};

export function ExploreScreen({
  initialStatus = 'ready',
  initialPlaces,
  initialViewMode = 'map',
  initialExploreMode = 'places',
  initialEventRequest,
  onNavigatePlaceDetail,
  repository,
  eventRepository,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [exploreMode, setExploreMode] = useState<ExploreMode>(initialExploreMode);
  const [viewMode, setViewMode] = useState<ExploreViewMode>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventCandidate | null>(null);
  const [isMapMoving, setIsMapMoving] = useState(false);

  // Places discovery
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

  // Default Event Discovery request: upcoming 7-day window
  const eventRequest: EventIntelligenceRequest | null = useMemo(() => {
    if (exploreMode !== 'events') return null;
    if (initialEventRequest) return initialEventRequest;

    const now = new Date();
    const startDateTime = new Date(now.getTime() + 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const endDateTime = new Date(now.getTime() + 7 * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    return {
      city: 'London',
      countryCode: 'GB',
      startDateTime,
      endDateTime,
      limit: 3,
    };
  }, [exploreMode, initialEventRequest]);

  // Live Event Intelligence
  const {
    events,
    status: eventStatus,
    isFallback: isEventFallback,
    error: eventError,
    refetch: refetchEvents,
  } = useEventIntelligence(eventRequest, eventRepository);

  const normalizedStatus = normalizeStatus(networkStatus);
  const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;
  const hasUsablePlaces = places.length > 0;
  const showBlockingError = normalizedStatus === 'error' && !hasUsablePlaces;
  const showConfirmedCategory = normalizedStatus === 'refreshing' || hasBackgroundError;
  const displayCategory = showConfirmedCategory ? confirmedCategory : selectedCategory;
  const markersDimmed =
    confirmedCategory !== selectedCategory &&
    (normalizedStatus === 'refreshing' || hasBackgroundError);

  // Top header height calculation for List mode padding
  const topControlsHeight = Math.max(insets.top, spacing.md) + 50 + 46 + 40;

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
  }, [places, displayCategory, searchQuery]);

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return events;

    return events.filter((ev) => {
      const venueName = ev.venues?.[0]?.name?.toLowerCase() ?? '';
      return ev.title.toLowerCase().includes(query) || venueName.includes(query);
    });
  }, [events, searchQuery]);

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

  const handleSelectCategory = useCallback(
    (category: ExploreCategory) => {
      setSelectedCategory(category);
      setSelectedPlaceId(null);
    },
    [setSelectedCategory],
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPlaceId(null);
  }, [setSelectedCategory]);

  const handleRetry = useCallback(() => {
    if (exploreMode === 'events') {
      refetchEvents();
    } else {
      retry();
    }
  }, [exploreMode, refetchEvents, retry]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'map' ? 'list' : 'map'));
  }, []);

  const isRateLimited = useMemo(() => {
    if (!eventError) return false;
    const msg = eventError.message?.toLowerCase() ?? '';
    const code = (eventError as any)?.code;
    return code === 'rateLimited' || msg.includes('429') || msg.includes('rate');
  }, [eventError]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
      {/* 1. Main View (Places or Events) */}
      {exploreMode === 'places' ? (
        viewMode === 'map' ? (
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
        )
      ) : (
        /* Events View */
        <ScrollView
          contentContainerStyle={[styles.eventsListContent, { paddingTop: topControlsHeight }]}
          showsVerticalScrollIndicator={false}>
          {filteredEvents.map((ev) => (
            <EventCandidateCard
              event={ev}
              isFallback={isEventFallback}
              key={ev.providerEventId}
              onPress={setSelectedEvent}
            />
          ))}
        </ScrollView>
      )}

      {/* 2. Top Floating Controls */}
      <View style={[styles.topControls, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        {/* Mode Switcher: Places vs Live Events */}
        <View style={styles.modeSwitcherWrap}>
          <Pressable
            accessibilityHint="Chuyển sang xem các địa điểm du lịch"
            accessibilityLabel="Địa điểm"
            accessibilityRole="button"
            accessibilityState={{ selected: exploreMode === 'places' }}
            onPress={() => {
              setExploreMode('places');
              setSelectedEvent(null);
            }}
            style={[
              styles.modeTab,
              exploreMode === 'places'
                ? [styles.modeTabActive, { backgroundColor: colors.brand.primary }]
                : [styles.modeTabInactive, { backgroundColor: colors.background.surface }],
            ]}>
            <MaterialIcons
              color={exploreMode === 'places' ? colors.text.inverse : colors.text.secondary}
              name="place"
              size={15}
            />
            <Text
              style={[
                styles.modeTabText,
                { color: exploreMode === 'places' ? colors.text.inverse : colors.text.primary },
              ]}>
              {t('explore.modePlaces')}
            </Text>
          </Pressable>

          <Pressable
            accessibilityHint="Chuyển sang xem sự kiện trực tiếp Ticketmaster"
            accessibilityLabel="Sự kiện trực tiếp"
            accessibilityRole="button"
            accessibilityState={{ selected: exploreMode === 'events' }}
            onPress={() => {
              setExploreMode('events');
              setSelectedPlaceId(null);
            }}
            style={[
              styles.modeTab,
              exploreMode === 'events'
                ? [styles.modeTabActive, { backgroundColor: '#024DDF' }]
                : [styles.modeTabInactive, { backgroundColor: colors.background.surface }],
            ]}>
            <MaterialIcons
              color={exploreMode === 'events' ? colors.text.inverse : colors.text.secondary}
              name="event"
              size={15}
            />
            <Text
              style={[
                styles.modeTabText,
                { color: exploreMode === 'events' ? colors.text.inverse : colors.text.primary },
              ]}>
              {t('intelligence.events.title')}
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <ExploreSearchBar
          onClear={handleClearSearch}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
        />

        {/* Category Chips (Places mode only) */}
        {exploreMode === 'places' ? (
          <ExploreCategoryChips
            onSelectCategory={handleSelectCategory}
            selectedCategory={selectedCategory}
          />
        ) : null}
      </View>

      {/* 3. Floating View Mode Toggle (Map / List) for Places */}
      {exploreMode === 'places' && normalizedStatus === 'ready' && filteredPlaces.length > 0 ? (
        <ExploreViewToggle onToggle={handleToggleViewMode} viewMode={viewMode} />
      ) : null}

      {/* 4. Loading States */}
      {(exploreMode === 'places' && normalizedStatus === 'initial-loading') ||
      (exploreMode === 'events' && eventStatus === 'loading') ? (
        <View
          accessibilityLabel={exploreMode === 'events' ? 'Đang tải dữ liệu sự kiện' : 'Đang tải dữ liệu bản đồ'}
          accessibilityRole="progressbar"
          style={[styles.loadingOverlay, { backgroundColor: colors.overlay.scrim }]}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : null}

      {/* 5. Error States */}
      {exploreMode === 'places' && showBlockingError ? (
        <ExploreErrorState onRetry={handleRetry} />
      ) : null}

      {exploreMode === 'events' && eventStatus === 'error' ? (
        <EventErrorState isRateLimited={isRateLimited} onRetry={handleRetry} />
      ) : null}

      {exploreMode === 'places' && hasBackgroundError && hasUsablePlaces ? (
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

      {/* 6. Empty States */}
      {exploreMode === 'places' &&
      normalizedStatus === 'ready' &&
      filteredPlaces.length === 0 &&
      !hasBackgroundError ? (
        <ExploreEmptyState onReset={handleResetFilters} />
      ) : null}

      {exploreMode === 'events' && eventStatus === 'empty' ? (
        <EventEmptyState />
      ) : null}

      {/* 7. Selected Place Bottom Preview Sheet */}
      {exploreMode === 'places' && normalizedStatus === 'ready' && selectedPlace ? (
        <ExplorePlacePreview
          onClose={handleDismissSelection}
          onPressDetail={onNavigatePlaceDetail}
          place={selectedPlace}
        />
      ) : null}

      {/* 8. Selected Event Bottom Preview Sheet */}
      {exploreMode === 'events' && selectedEvent ? (
        <EventPreviewSheet
          event={selectedEvent}
          isFallback={isEventFallback}
          onClose={() => setSelectedEvent(null)}
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
  modeSwitcherWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 2,
  },
  modeTab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 2,
    flexDirection: 'row',
    gap: 5,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modeTabActive: {},
  modeTabInactive: {
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  modeTabText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  eventsListContent: {
    paddingBottom: 100,
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
