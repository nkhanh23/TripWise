import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import type { RootStackParamList } from '../../../navigation/types';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { ItineraryCard } from '../components/ItineraryCard';
import { TripDaySelector } from '../components/TripDaySelector';
import { TripDetailHero } from '../components/TripDetailHero';
import { TripDetailTopBar } from '../components/TripDetailTopBar';
import { TripEmptyDayState } from '../components/TripEmptyDayState';
import { TripFAB } from '../components/TripFAB';
import { TripSummaryBentoCard } from '../components/TripSummaryBentoCard';
import { getMockTripDetail } from '../data/mockTripDetail';
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
};

export function TripDetailScreen({
  route,
  navigation,
  initialStatus = 'ready',
  customTripDetail,
  onPressAddPlace,
  onPressEdit,
  onPressShare,
}: Props) {
  const insets = useSafeAreaInsets();
  const tripId = route?.params?.tripId ?? 'trip_bangkok';

  const [status, setStatus] = useState<TripDetailUIStatus>(initialStatus);
  const [selectedDayId, setSelectedDayId] = useState<string>('day_1');

  // Fetch / Select trip detail data
  const tripData: TripDetailData | null = useMemo(() => {
    if (customTripDetail) {
      return customTripDetail;
    }
    return getMockTripDetail(tripId);
  }, [customTripDetail, tripId]);

  // Derived selected day
  const activeDay = useMemo(() => {
    if (!tripData?.days || tripData.days.length === 0) {
      return null;
    }
    return (
      tripData.days.find((d) => d.id === selectedDayId) ??
      tripData.days[0]
    );
  }, [tripData, selectedDayId]);

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
      }
    },
    [navigation]
  );

  const handleGetDirections = useCallback(
    (item: ItineraryItem) => {
      navigation.navigate('RoutePreview', {
        destinationId: item.placeId || 'place_wat_arun',
        destinationName: item.title,
      });
    },
    [navigation]
  );

  const handleViewMap = useCallback(() => {
    navigation.navigate('MainTabs');
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setStatus('ready');
  }, []);

  const handleFABPress = useCallback(() => {
    if (onPressAddPlace) {
      onPressAddPlace();
    }
  }, [onPressAddPlace]);

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
          heroImageUrl={tripData.heroImageUrl}
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
          selectedDayId={activeDay?.id ?? selectedDayId}
        />
      </View>
    );
  }, [tripData, handleViewMap, handleSelectDay, activeDay, selectedDayId]);

  // Render State 1: Loading
  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <TripDetailTopBar onBack={handleBack} topInset={insets.top} />
        <View
          accessibilityLabel="Đang tải chi tiết chuyến đi"
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
      <View style={styles.container}>
        <TripDetailTopBar onBack={handleBack} topInset={insets.top} />
        <View accessibilityRole="alert" style={styles.centerContainer}>
          <MaterialIcons color={colors.brand.red} name="error-outline" size={44} />
          <Text style={styles.errorTitle}>Unable to load trip details</Text>
          <AppText style={styles.errorSubtitle}>
            We encountered an issue loading this itinerary.
          </AppText>
          <Pressable
            accessibilityHint="Thử tải lại thông tin chuyến đi"
            accessibilityLabel="Thử lại"
            accessibilityRole="button"
            onPress={handleRetry}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Render State 3: Not Found
  if (!tripData || status === 'not_found') {
    return (
      <View style={styles.container}>
        <TripDetailTopBar onBack={handleBack} topInset={insets.top} />
        <View accessibilityRole="alert" style={styles.centerContainer}>
          <MaterialIcons color={colors.text.muted} name="search-off" size={44} />
          <Text style={styles.errorTitle}>Trip not found</Text>
          <AppText style={styles.errorSubtitle}>
            The requested trip could not be found in your account.
          </AppText>
          <Pressable
            accessibilityHint="Quay lại danh sách chuyến đi"
            accessibilityLabel="Quay lại danh sách chuyến đi"
            accessibilityRole="button"
            onPress={handleBack}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Back to Trips</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const itemsData = activeDay?.items ?? [];

  return (
    <View style={styles.container}>
      {/* 1. Floating Top Navigation Bar */}
      <TripDetailTopBar
        onBack={handleBack}
        onEdit={onPressEdit}
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
        renderItem={({ item, index }) => (
          <View style={styles.itemWrapper}>
            <ItineraryCard
              isFirst={index === 0}
              isLast={index === itemsData.length - 1}
              item={item}
              onGetDirections={handleGetDirections}
              onPressItem={handlePressItem}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* 3. Floating Action Button (FAB) */}
      <TripFAB bottomInset={insets.bottom} onPress={handleFABPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.surface,
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
    color: colors.text.primary,
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  errorSubtitle: {
    color: colors.text.secondary,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
