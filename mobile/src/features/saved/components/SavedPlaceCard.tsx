import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { ResolvedImage } from '../../../integration/contracts';
import { ImageAttribution } from '../../images/components/ImageAttribution';

type CardPlaceItem = {
  id: string;
  name: string;
  categoryLabel?: string;
  address?: string;
  imageUrl?: string;
  rating?: number;
  resolvedImage?: ResolvedImage;
};

type Props = {
  place: CardPlaceItem;
  isSaved?: boolean;
  onPress: (placeId: string) => void;
  onToggleSave: (placeId: string) => void;
};

export const SavedPlaceCard = memo(function SavedPlaceCard({
  place,
  isSaved = true,
  onPress,
  onToggleSave,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  // Extract simple city/area name for bottom-left location pill
  const locationTag = (place.address || '').split(',').pop()?.trim() || 'Bangkok';

  return (
    <Pressable
      accessibilityHint={t('savedPlaces.viewDetailsHint', { name: place.name })}
      accessibilityLabel={`${place.name}, ${place.categoryLabel}`}
      accessibilityRole="button"
      onPress={() => onPress(place.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
        pressed && styles.pressed,
      ]}>
      {/* 1. Image Container with Badges */}
      <View style={styles.imageContainer}>
        {place.imageUrl ? (
          <Image
            accessibilityLabel={place.name}
            accessibilityRole="image"
            source={{ uri: place.imageUrl }}
            style={[
              styles.image,
              { backgroundColor: colors.background.surfaceVariant },
            ]}
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: colors.background.surfaceVariant },
            ]}>
            <MaterialIcons
              color={colors.text.muted}
              name="image"
              size={36}
            />
          </View>
        )}

        {/* Top-Right Bookmark Button */}
        <Pressable
          accessibilityHint={
            isSaved ? t('savedPlaces.unsaveHint') : t('savedPlaces.saveHint')
          }
          accessibilityLabel={
            isSaved ? t('savedPlaces.unsaveHint') : t('savedPlaces.saveHint')
          }
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleSave(place.id);
          }}
          style={({ pressed: btnPressed }) => [
            styles.bookmarkButton,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(30, 31, 36, 0.85)'
                  : 'rgba(255, 255, 255, 0.85)',
            },
            btnPressed && styles.btnPressed,
          ]}>
          <MaterialIcons
            color={colors.brand.primary}
            name={isSaved ? 'bookmark' : 'bookmark-border'}
            size={20}
          />
        </Pressable>

        {/* Bottom-Left Location Pill */}
        <View
          style={[
            styles.locationPill,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(20, 21, 25, 0.9)'
                  : 'rgba(255, 255, 255, 0.9)',
            },
          ]}>
          <MaterialIcons color={colors.text.secondary} name="location-on" size={14} />
          <Text
            numberOfLines={1}
            style={[styles.locationText, { color: colors.text.secondary }]}>
            {locationTag}
          </Text>
        </View>

        <ImageAttribution attribution={place.resolvedImage?.attribution} />
      </View>

      {/* 2. Info Area */}
      <View style={styles.infoArea}>
        <View style={styles.headerRow}>
          <Text
            numberOfLines={1}
            style={[styles.placeName, { color: colors.text.primary }]}>
            {place.name}
          </Text>
          {place.rating !== undefined && place.rating !== null ? (
            <View style={styles.ratingRow}>
              <MaterialIcons color={colors.brand.yellow} name="star" size={16} />
              <Text
                style={[
                  styles.ratingText,
                  {
                    color:
                      effectiveTheme === 'dark'
                        ? colors.brand.yellow
                        : colors.brand.primary,
                  },
                ]}>
                {place.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          style={[styles.categorySubtitle, { color: colors.text.secondary }]}>
          {place.categoryLabel}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 3,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  imageContainer: {
    height: 180,
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
  bookmarkButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 38,
  },
  locationPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    bottom: spacing.sm,
    flexDirection: 'row',
    gap: 4,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    position: 'absolute',
  },
  locationText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.regular,
  },
  infoArea: {
    gap: 4,
    padding: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  placeName: {
    flex: 1,
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.sm,
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  ratingText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  categorySubtitle: {
    fontSize: typography.bodySmall,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
});
