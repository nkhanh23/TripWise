import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { ItineraryCard } from '../components/ItineraryCard';
import { TripDaySelector } from '../components/TripDaySelector';
import { TripDetailHero } from '../components/TripDetailHero';
import { TripDetailTopBar } from '../components/TripDetailTopBar';
import { TripEmptyDayState } from '../components/TripEmptyDayState';
import { TripFAB } from '../components/TripFAB';
import { TripSummaryBentoCard } from '../components/TripSummaryBentoCard';
import { getMockTripDetail } from '../data/mockTripDetail';
import type { PlaceImageRepository, PlacePhotoRepository, PlaceResolutionRepository, SavedTripsRepository, TripCoverImageRepository, WeatherRepository } from '../../../integration/repositories';
import { CompositePlaceImageRepository, SequentialTripCoverImageRepository } from '../../../integration/imageResolution';
import { mapSavedTripDetailToTripDetailData } from '../integrationMappers';
import { asTripId, isUuid } from '../../../integration/validation';
import type { TripId } from '../../../integration/contracts';
import { usePlaceResolution } from '../placeResolution';
import { useTripPlacePhotos } from '../placePhotos';
import { useTripWeather } from '../weather';
import { OpenMeteoWeatherRepository } from '../../../integration/remote/publicProviderRepositories';
import { SupabasePlacePhotoRepository } from '../../../integration/remote/supabasePlacePhotoRepository';
import { SupabaseWikimediaImageRepository } from '../../../integration/remote/supabaseWikimediaImageRepository';
import { SupabasePlaceResolutionRepository } from '../../../integration/remote/supabasePlaceResolutionRepository';
import { SupabaseSavedTripsRepository } from '../../../integration/remote/supabaseTripRepositories';
import { supabase } from '../../../lib/supabase/client';
import type {
  ItineraryItem,
  TripDetailData,
  TripDetailUIStatus,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetail'> & {
  initialStatus?: TripDetailUIStatus;
  customTripDetail?: TripDetailData;
  onPressAddPlace?: () => void;
  onPressEdit?: () => void;
  onPressShare?: () => void;
  repository?: SavedTripsRepository;
  placeResolutionRepository?: PlaceResolutionRepository;
  placePhotoRepository?: PlacePhotoRepository;
  placeImageRepository?: PlaceImageRepository;
  tripCoverRepository?: TripCoverImageRepository;
  weatherRepository?: WeatherRepository;
  weatherNow?: () => Date;
  fixtureMode?: boolean;
};

export function TripDetailScreen({
  route,
  navigation,
  initialStatus = 'ready',
  customTripDetail,
  onPressAddPlace,
  onPressEdit,
  onPressShare,
  repository,
  placeResolutionRepository,
  placePhotoRepository,
  placeImageRepository,
  tripCoverRepository,
  weatherRepository,
  weatherNow,
  fixtureMode,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const tripId = route?.params?.tripId;
  const isRemoteTrip = Boolean(tripId && isUuid(tripId));
  const isFixture = Boolean(
    fixtureMode || customTripDetail || (!isRemoteTrip && tripId?.startsWith('trip_'))
  );

  const effectiveRepository = useMemo(() => {
    if (customTripDetail || fixtureMode) return repository;
    return repository ?? (isRemoteTrip ? new SupabaseSavedTripsRepository(supabase) : undefined);
  }, [customTripDetail, fixtureMode, isRemoteTrip, repository]);

  const effectivePlaceResolutionRepository = useMemo(() => {
    if (customTripDetail || fixtureMode) return placeResolutionRepository;
    return (
      placeResolutionRepository ??
      (effectiveRepository ? new SupabasePlaceResolutionRepository(supabase) : undefined)
    );
  }, [customTripDetail, effectiveRepository, fixtureMode, placeResolutionRepository]);

  const effectivePlacePhotoRepository = useMemo(() => {
    if (customTripDetail || fixtureMode) return placePhotoRepository;
    return (
      placePhotoRepository ??
      (effectiveRepository ? new SupabasePlacePhotoRepository(supabase) : undefined)
    );
  }, [customTripDetail, effectiveRepository, fixtureMode, placePhotoRepository]);
  const effectiveImageRepositories = useMemo(() => {
    if (!effectivePlacePhotoRepository) {
      return { place: placeImageRepository, cover: tripCoverRepository };
    }
    if (customTripDetail || fixtureMode) {
      return {
        place: placeImageRepository ?? {
          getPlaceImage: async (request, signal) => {
            try {
              const photo = await effectivePlacePhotoRepository.getPhoto(request, signal);
              return photo.photoUri
                ? { uri: photo.photoUri, source: 'GOOGLE_PLACE' as const }
                : { uri: null, source: 'PLACEHOLDER' as const };
            } catch {
              return { uri: null, source: 'PLACEHOLDER' as const };
            }
          },
        },
        cover: tripCoverRepository ?? {
          getTripCover: async (request, signal) => {
            for (const googlePlaceId of request.googlePlaceIds.slice(0, 2)) {
              try {
                const photo = await effectivePlacePhotoRepository.getPhoto({
                  googlePlaceId,
                  ...(request.maxWidth ? { maxWidth: request.maxWidth } : {}),
                }, signal);
                if (photo.photoUri) return { uri: photo.photoUri, source: 'GOOGLE_PLACE' as const };
              } catch {
                // Optional fixture enrichment continues to the next candidate.
              }
            }
            return { uri: null, source: 'PLACEHOLDER' as const };
          },
        },
      };
    }
    const wikimedia = new SupabaseWikimediaImageRepository(supabase);
    return {
      place: placeImageRepository ?? new CompositePlaceImageRepository(effectivePlacePhotoRepository, wikimedia),
      cover: tripCoverRepository ?? new SequentialTripCoverImageRepository(
        effectivePlacePhotoRepository,
        wikimedia,
        wikimedia,
      ),
    };
  }, [customTripDetail, effectivePlacePhotoRepository, fixtureMode, placeImageRepository, tripCoverRepository]);

  const effectiveWeatherRepository = useMemo(() => {
    if (customTripDetail || fixtureMode) return weatherRepository;
    return weatherRepository ?? new OpenMeteoWeatherRepository();
  }, [customTripDetail, fixtureMode, weatherRepository]);

  const [status, setStatus] = useState<TripDetailUIStatus>(
    isFixture ? initialStatus : (isRemoteTrip ? 'loading' : 'not_found')
  );
  const [selectedDayIdState, setSelectedDayId] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [remoteTripData, setRemoteTripData] = useState<TripDetailData | null>(null);
  const remoteTripDataRef = useRef<TripDetailData | null>(null);
  const remoteLoadRef = useRef<{ tripId: string; promise: Promise<boolean> } | null>(null);

  const loadRemoteDetail = useCallback((showBlockingLoader = true): Promise<boolean> => {
    if (!effectiveRepository || !tripId || !isRemoteTrip) return Promise.resolve(false);
    const inFlight = remoteLoadRef.current;
    if (inFlight?.tripId === tripId) return inFlight.promise;
    let typedTripId: TripId;
    try {
      typedTripId = asTripId(tripId);
    } catch {
      setRemoteTripData(null);
      setStatus('not_found');
      return Promise.resolve(false);
    }
    const hadExistingContent = remoteTripDataRef.current !== null;
    if (showBlockingLoader) setStatus('loading');

    let load!: Promise<boolean>;
    load = effectiveRepository.getDetail(typedTripId)
      .then((detail) => {
        if (!detail) {
          remoteTripDataRef.current = null;
          setRemoteTripData(null);
          setStatus('not_found');
          return false;
        }
        const mapped = mapSavedTripDetailToTripDetailData(detail);
        remoteTripDataRef.current = mapped;
        setRemoteTripData(mapped);
        setStatus('ready');
        return true;
      })
      .catch(() => {
        if (hadExistingContent && !showBlockingLoader) {
          setStatus('ready');
        } else {
          remoteTripDataRef.current = null;
          setRemoteTripData(null);
          setStatus('error');
        }
        return false;
      })
      .finally(() => {
        if (remoteLoadRef.current?.promise === load) remoteLoadRef.current = null;
      });
    remoteLoadRef.current = { tripId, promise: load };
    return load;
  }, [effectiveRepository, tripId, isRemoteTrip]);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      if (isRemoteTrip) {
        void loadRemoteDetail(remoteTripDataRef.current === null);
      } else {
        setRefreshKey((prev) => prev + 1);
      }
    });
    return unsubscribe;
  }, [isRemoteTrip, loadRemoteDetail, navigation]);

  useEffect(() => {
    if (!effectiveRepository || !isRemoteTrip) return;
    const handle = setTimeout(() => {
      void loadRemoteDetail(true);
    }, 0);
    return () => clearTimeout(handle);
  }, [loadRemoteDetail, refreshKey, effectiveRepository, isRemoteTrip]);

  const { statuses: resolutionStatuses, resolve: resolvePlace } = usePlaceResolution(
    effectivePlaceResolutionRepository,
    loadRemoteDetail,
  );

  const handleResolveItem = useCallback(
    (item: ItineraryItem) => {
      void resolvePlace(item.id);
    },
    [resolvePlace]
  );

  // Fetch / Select trip detail data
  const tripData: TripDetailData | null = useMemo(() => {
    if (customTripDetail) {
      return customTripDetail;
    }
    if (fixtureMode || (!isRemoteTrip && tripId?.startsWith('trip_'))) {
      void refreshKey;
      return getMockTripDetail(tripId ?? 'trip_bangkok');
    }
    if (isRemoteTrip) return remoteTripData;
    return null;
  }, [customTripDetail, fixtureMode, isRemoteTrip, remoteTripData, tripId, refreshKey]);

  const { heroImage, heroPhotoUrl, itemImages } = useTripPlacePhotos(
    tripData,
    effectiveImageRepositories.place,
    effectiveImageRepositories.cover,
  );

  // Derived active day ID
  const effectiveSelectedDayId = useMemo(() => {
    if (!tripData?.days || tripData.days.length === 0) return selectedDayIdState || 'day_1';
    if (selectedDayIdState && tripData.days.some((d) => d.id === selectedDayIdState)) {
      return selectedDayIdState;
    }
    return tripData.days[0].id;
  }, [tripData, selectedDayIdState]);

  // Derived selected day
  const activeDay = useMemo(() => {
    if (!tripData?.days || tripData.days.length === 0) {
      return null;
    }
    return (
      tripData.days.find((d) => d.id === effectiveSelectedDayId) ??
      tripData.days[0]
    );
  }, [tripData, effectiveSelectedDayId]);

  const { activeDayWeather } = useTripWeather(
    tripData,
    activeDay,
    effectiveWeatherRepository,
    weatherNow,
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  }, [navigation]);

  const handleSelectDay = useCallback((dayId: string) => {
    setSelectedDayId(dayId);
  }, []);

  const handlePressItem = useCallback(
    (item: ItineraryItem) => {
      if (item.placeId) {
        navigation.navigate('PlaceDetail', { placeId: item.placeId });
      } else {
        Alert.alert(t('common.unavailableTitle'), t('common.unavailableMessage'));
      }
    },
    [navigation, t]
  );

  const handleGetDirections = useCallback(
    (item: ItineraryItem) => {
      const verifiedCoordinates = tripData?.days
        .flatMap((day) => day.items)
        .filter(
          (candidate) =>
            candidate.resolution === 'VERIFIED' &&
            candidate.latitude !== undefined &&
            candidate.longitude !== undefined
        )
        .map((candidate) => ({
          latitude: candidate.latitude!,
          longitude: candidate.longitude!,
        })) ?? [];

      navigation.navigate('RoutePreview', {
        destinationId: item.googlePlaceId ?? item.placeId ?? item.id,
        destinationName: item.title,
        coordinates: verifiedCoordinates.length >= 2 ? verifiedCoordinates : undefined,
      });
    },
    [navigation, tripData]
  );

  const handleViewMap = useCallback(() => {
    if (!tripId) return;
    navigation.navigate('TripMap', {
      tripId,
      initialDayId: activeDay?.id ?? effectiveSelectedDayId,
    });
  }, [navigation, tripId, activeDay, effectiveSelectedDayId]);

  const handleRetry = useCallback(() => {
    if (isRemoteTrip) {
      void loadRemoteDetail(true);
    } else {
      setStatus('ready');
    }
  }, [isRemoteTrip, loadRemoteDetail]);

  const handleFABPress = useCallback(() => {
    if (onPressAddPlace) {
      onPressAddPlace();
    } else if (!isFixture) {
      Alert.alert(t('common.unavailableTitle'), t('addPlace.unavailableSubtitle'));
    } else if (tripId) {
      navigation.navigate('AddPlace', {
        tripId,
        initialDayId: activeDay?.id ?? effectiveSelectedDayId,
      });
    }
  }, [onPressAddPlace, isFixture, navigation, tripId, activeDay, effectiveSelectedDayId, t]);

  // Header Component for Virtualized Itinerary FlatList
  const listHeader = useMemo(() => {
    if (!tripData) {
      return null;
    }

    return (
      <View style={styles.headerContainer}>
        {/* 1. Hero Section */}
        <TripDetailHero
          dateLabel={tripData.dateLabel}
          destination={tripData.destination}
          heroImageUrl={heroPhotoUrl || tripData.heroImageUrl}
          resolvedImage={heroImage ?? undefined}
          topInset={insets.top}
        />

        {/* 2. Summary Bento Card */}
        <TripSummaryBentoCard
          budgetPercent={tripData.budgetPercent}
          budgetSpent={tripData.budgetSpent}
          budgetTotal={tripData.budgetTotal}
          onViewMap={handleViewMap}
          savedPlacesCount={tripData.savedPlacesCount}
          travelers={tripData.travelers}
        />

        {/* 3. Day Selector Chips */}
        <TripDaySelector
          days={tripData.days}
          onSelectDay={handleSelectDay}
          selectedDayId={activeDay?.id ?? effectiveSelectedDayId}
          weather={activeDayWeather}
        />
      </View>
    );
  }, [tripData, heroImage, heroPhotoUrl, insets.top, handleViewMap, handleSelectDay, activeDay, effectiveSelectedDayId, activeDayWeather]);

  // Render State 1: Loading
  if (status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
        <TripDetailTopBar onBack={handleBack} topInset={insets.top} />
        <View
          accessibilityLabel={t('common.loading')}
          accessibilityRole="progressbar"
          style={styles.centerContainer}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      </View>
    );
  }

  // Render State 2: Error
  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
        <TripDetailTopBar onBack={handleBack} topInset={insets.top} />
        <View accessibilityRole="alert" style={styles.centerContainer}>
          <MaterialIcons color={colors.state.error} name="error-outline" size={44} />
          <Text style={[styles.errorTitle, { color: colors.state.error }]}>
            {t('tripDetail.errorTitle')}
          </Text>
          <AppText style={styles.errorSubtitle}>
            {t('tripDetail.errorSubtitle')}
          </AppText>
          <Pressable
            accessibilityHint={t('common.retry')}
            accessibilityLabel={t('common.retry')}
            accessibilityRole="button"
            onPress={handleRetry}
            style={[styles.retryButton, { backgroundColor: colors.brand.primary }]}>
            <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Render State 3: Not Found
  if (!tripData || status === 'not_found') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
        <TripDetailTopBar onBack={handleBack} topInset={insets.top} />
        <View accessibilityRole="alert" style={styles.centerContainer}>
          <MaterialIcons color={colors.text.muted} name="search-off" size={44} />
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
            {t('tripDetail.notFoundTitle')}
          </Text>
          <AppText style={styles.errorSubtitle}>
            {t('tripDetail.notFoundSubtitle')}
          </AppText>
          <Pressable
            accessibilityHint={t('tripDetail.backToTrips')}
            accessibilityLabel={t('tripDetail.backToTrips')}
            accessibilityRole="button"
            onPress={handleBack}
            style={[styles.retryButton, { backgroundColor: colors.brand.primary }]}>
            <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>
              {t('tripDetail.backToTrips')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const itemsData = activeDay?.items ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
      {/* 1. Floating Top Navigation Bar */}
      <TripDetailTopBar
        onBack={handleBack}
        onEdit={onPressEdit}
        onMap={handleViewMap}
        onShare={onPressShare}
        title={tripData.title || 'TripWise'}
        topInset={insets.top}
      />

      {/* 2. Virtualized Itinerary List */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={itemsData}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <TripEmptyDayState
            dayLabel={activeDay?.dateLabel}
            onExplore={handleViewMap}
          />
        }
        ListHeaderComponent={listHeader}
        renderItem={({ item, index }) => {
          const image = item.googlePlaceId ? itemImages[item.googlePlaceId] : undefined;
          const displayItem = image?.uri ? { ...item, imageUrl: image.uri, resolvedImage: image } : item;

          return (
            <View style={styles.itemWrapper}>
              <ItineraryCard
                isFirst={index === 0}
                isLast={index === itemsData.length - 1}
                item={displayItem}
                onGetDirections={handleGetDirections}
                onPressItem={handlePressItem}
                onResolve={handleResolveItem}
                resolutionStatus={resolutionStatuses[item.id]}
              />
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* 3. Floating Action Button (FAB) */}
      <TripFAB bottomInset={insets.bottom} onPress={handleFABPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: spacing.xs,
  },
  listContent: {
    paddingBottom: 96,
  },
  itemWrapper: {
    paddingHorizontal: spacing.lg,
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  errorSubtitle: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
