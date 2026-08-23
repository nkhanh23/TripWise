import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { exploreCategories, mockExplorePlaces } from '../../explore/data/mockPlaces';
import type { ExploreCategory, ExplorePlace } from '../../explore/types';
import { useTranslation } from '../../../i18n';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { AddPlaceConfirmationSheet } from '../components/AddPlaceConfirmationSheet';
import { AddPlaceResultCard } from '../components/AddPlaceResultCard';
import { addPlaceToTripItinerary, getMockTripDetail } from '../data/mockTripDetail';
import type { ItineraryItem, TripDetailData } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPlace'>;

export function AddPlaceScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const tripId = route.params?.tripId ?? 'trip_bangkok';
  const initialDayId = route.params?.initialDayId;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ExploreCategory>('all');
  const [selectedPlace, setSelectedPlace] = useState<ExplorePlace | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);

  // Load trip data for day selection
  const tripData: TripDetailData | null = useMemo(() => {
    return getMockTripDetail(tripId);
  }, [tripId]);

  const days = useMemo(() => {
    return tripData?.days ?? [];
  }, [tripData]);

  // Local filtering
  const filteredPlaces = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();

    return mockExplorePlaces.filter((place) => {
      // Category filter
      if (selectedCategory !== 'all' && place.category !== selectedCategory) {
        return false;
      }
      // Query filter
      if (trimmed.length > 0) {
        const matchesName = place.name.toLowerCase().includes(trimmed);
        const matchesAddress = place.address.toLowerCase().includes(trimmed);
        const matchesCategory = (place.categoryLabel ?? '').toLowerCase().includes(trimmed);
        const matchesDesc = (place.description ?? '').toLowerCase().includes(trimmed);
        return matchesName || matchesAddress || matchesCategory || matchesDesc;
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleSelectPlace = useCallback((place: ExplorePlace) => {
    setSelectedPlace(place);
    setIsConfirmationOpen(true);
  }, []);

  const handleCloseConfirmation = useCallback(() => {
    setIsConfirmationOpen(false);
  }, []);

  const handleConfirmAddPlace = useCallback(
    (data: {
      place: ExplorePlace;
      dayId: string;
      time: string;
      durationMinutes: number;
      note?: string;
    }) => {
      const hour = parseInt(data.time.split(':')[0], 10);
      const isRestaurant =
        data.place.category === 'restaurants' || data.place.category === 'coffee';

      const iconName: keyof typeof MaterialIcons.glyphMap =
        data.place.iconName && data.place.iconName in MaterialIcons.glyphMap
          ? (data.place.iconName as keyof typeof MaterialIcons.glyphMap)
          : isRestaurant
          ? 'restaurant'
          : 'account-balance';

      const newItem: ItineraryItem = {
        id: `item_${data.dayId}_${Date.now()}`,
        type: isRestaurant ? 'restaurant' : 'place',
        time: data.time,
        timePeriod: hour >= 12 ? 'PM' : 'AM',
        title: data.place.name,
        subtitle: data.note || data.place.categoryLabel || data.place.address,
        description: data.note || data.place.description,
        imageUrl: data.place.imageUrl,
        iconName,
        iconBgVariant: isRestaurant ? 'secondary' : 'tertiary',
        placeId: data.place.id,
        durationMinutes: data.durationMinutes,
        location: data.place.address,
        directionsLabel: 'Get Directions',
      };

      addPlaceToTripItinerary(tripId, data.dayId, newItem);
      setIsConfirmationOpen(false);
      navigation.goBack();
    },
    [tripId, navigation]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background.canvas,
          paddingTop: insets.top,
        },
      ]}>
      {/* 1. Header Top Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.background.surface,
            borderBottomColor: colors.border.subtle,
          },
        ]}>
        <Pressable
          accessibilityHint={t('common.back')}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: colors.background.surfaceVariant }]}>
          <MaterialIcons color={colors.brand.primary} name="arrow-back" size={22} />
        </Pressable>

        <AppText style={[styles.headerTitle, { color: colors.text.primary }]}>
          {t('addPlace.title')}
        </AppText>

        <View style={styles.headerSpacer} />
      </View>

      {/* 2. Search Bar */}
      <View
        style={[
          styles.searchSection,
          {
            backgroundColor: colors.background.surface,
          },
        ]}>
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.background.surfaceVariant,
              borderColor: colors.border.subtle,
            },
          ]}>
          <MaterialIcons
            color={colors.icon.secondary}
            name="search"
            size={22}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityHint={t('addPlace.searchPlaceholder')}
            accessibilityLabel={t('common.search')}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
            onChangeText={setSearchQuery}
            placeholder={t('addPlace.searchPlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={[styles.searchInput, { color: colors.text.primary }]}
            value={searchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              accessibilityHint={t('addPlace.clearSearch')}
              accessibilityLabel={t('addPlace.clearSearch')}
              accessibilityRole="button"
              onPress={handleClearSearch}
              style={styles.clearButton}>
              <MaterialIcons color={colors.icon.secondary} name="close" size={18} />
            </Pressable>
          ) : null}
        </View>

        {/* 3. Category Filter Chips */}
        <ScrollView
          contentContainerStyle={styles.categoryScroll}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {exploreCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const labelKey = `explore.categories.${cat.id}`;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id as ExploreCategory)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected
                      ? colors.brand.primaryContainer
                      : colors.background.surface,
                    borderColor: isSelected
                      ? colors.brand.primaryContainer
                      : colors.border.default,
                  },
                ]}>
                <MaterialIcons
                  color={isSelected ? colors.text.inverse : colors.icon.secondary}
                  name={cat.iconName}
                  size={16}
                />
                <AppText
                  style={[
                    styles.categoryChipText,
                    {
                      color: isSelected ? colors.text.inverse : colors.text.primary,
                      fontWeight: isSelected
                        ? typography.fontWeight.bold
                        : typography.fontWeight.regular,
                    },
                  ]}>
                  {t(labelKey)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Results List Header & Virtualized FlatList */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons color={colors.icon.muted} name="search-off" size={48} />
            <AppText style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {t('addPlace.noResultsTitle')}
            </AppText>
            <AppText style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              {t('addPlace.noResultsSubtitle')}
            </AppText>
            {searchQuery.length > 0 || selectedCategory !== 'all' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                style={[styles.resetButton, { backgroundColor: colors.brand.primary }]}>
                <AppText style={[styles.resetButtonText, { color: colors.text.inverse }]}>
                  {t('addPlace.clearSearch')}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        }
        ListHeaderComponent={
          filteredPlaces.length > 0 ? (
            <View style={styles.resultsHeader}>
              <AppText style={[styles.resultsTitle, { color: colors.text.primary }]}>
                {searchQuery.trim().length > 0
                  ? t('addPlace.searchResults')
                  : t('addPlace.recommended')}
              </AppText>
              <AppText style={[styles.resultsCount, { color: colors.text.muted }]}>
                ({filteredPlaces.length})
              </AppText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <AddPlaceResultCard
            isSelected={selectedPlace?.id === item.id && isConfirmationOpen}
            onSelect={handleSelectPlace}
            place={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* 5. Add Place Confirmation Sheet */}
      <AddPlaceConfirmationSheet
        days={days}
        initialDayId={initialDayId}
        onClose={handleCloseConfirmation}
        onConfirm={handleConfirmAddPlace}
        place={selectedPlace}
        visible={isConfirmationOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  headerSpacer: {
    width: 38,
  },
  searchSection: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchContainer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    height: '100%',
  },
  clearButton: {
    padding: spacing.xs,
  },
  categoryScroll: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  categoryChipText: {
    fontSize: typography.bodySmall,
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  resultsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  resultsTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  resultsCount: {
    fontSize: typography.bodySmall,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.bodySmall,
    paddingHorizontal: spacing.xl,
    textAlign: 'center',
  },
  resetButton: {
    borderRadius: radius.pill,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resetButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
