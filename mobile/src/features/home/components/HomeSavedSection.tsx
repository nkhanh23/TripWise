import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useCallback } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { SavedPlaceItem } from '../types';

type Props = {
  savedPlaces: SavedPlaceItem[];
  onPressViewAll: () => void;
  onPressPlace?: (placeId: string) => void;
};

export const HomeSavedSection = memo(function HomeSavedSection({
  savedPlaces,
  onPressViewAll,
  onPressPlace,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item }: { item: SavedPlaceItem }) => {
      return (
        <Pressable
          accessibilityHint={item.name}
          accessibilityLabel={`${item.name}, ${item.location}`}
          accessibilityRole="button"
          onPress={() => onPressPlace?.(item.id)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
            pressed && styles.cardPressed,
          ]}>
          {/* Thumbnail */}
          <View style={styles.imageContainer}>
            {item.imageUrl ? (
              <Image
                accessibilityRole="image"
                resizeMode="cover"
                source={{ uri: item.imageUrl }}
                style={styles.image}
              />
            ) : (
              <View
                style={[
                  styles.imagePlaceholder,
                  { backgroundColor: colors.background.surfaceVariant },
                ]}>
                <MaterialIcons color={colors.brand.primary} name="place" size={32} />
              </View>
            )}

            {/* Bookmark badge */}
            <View
              style={[
                styles.bookmarkBadge,
                { backgroundColor: colors.background.surface },
              ]}>
              <MaterialIcons color={colors.brand.primary} name="bookmark" size={16} />
            </View>
          </View>

          {/* Place Details */}
          <View style={styles.cardContent}>
            <Text numberOfLines={1} style={[styles.placeName, { color: colors.text.primary }]}>
              {item.name}
            </Text>
            <View style={styles.locationRow}>
              <MaterialIcons color={colors.text.secondary} name="location-on" size={12} />
              <Text
                numberOfLines={1}
                style={[styles.locationText, { color: colors.text.secondary }]}>
                {item.location}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [colors, onPressPlace]
  );

  const keyExtractor = useCallback((item: SavedPlaceItem) => item.id, []);

  if (savedPlaces.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {t('home.savedForLater')}
        </Text>
        <Pressable
          accessibilityHint={t('home.viewAll')}
          accessibilityLabel={t('home.viewAll')}
          accessibilityRole="button"
          onPress={onPressViewAll}>
          <Text style={[styles.viewAllText, { color: colors.brand.primary }]}>
            {t('home.viewAll')}
          </Text>
        </Pressable>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={savedPlaces}
        horizontal
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  viewAllText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.control, // 16px matching Stitch rounded-xl
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    width: 200,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    height: 100,
    position: 'relative',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  bookmarkBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 2,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 28,
  },
  cardContent: {
    padding: spacing.sm,
  },
  placeName: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
  },
});
