import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { ExplorePlace } from '../types';

type Props = {
  place: ExplorePlace;
  isSelected: boolean;
  onSelect: (place: ExplorePlace) => void;
};

export const ExplorePlaceListItem = memo(function ExplorePlaceListItem({
  place,
  isSelected,
  onSelect,
}: Props) {
  const { colors, effectiveTheme } = useTheme();

  return (
    <Pressable
      accessibilityHint={`Xem chi tiết địa điểm ${place.name}`}
      accessibilityLabel={`${place.name}, ${place.categoryLabel}, đánh giá ${place.rating} sao`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(place)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
        isSelected && [
          styles.selectedCard,
          {
            backgroundColor: effectiveTheme === 'dark' ? '#1A2E44' : '#F3F8FF',
            borderColor: colors.brand.primary,
          },
        ],
        pressed && styles.cardPressed,
      ]}>
      {/* Thumbnail */}
      <Image
        accessibilityLabel={place.name}
        accessibilityRole="image"
        source={{ uri: place.imageUrl }}
        style={[
          styles.thumbnail,
          { backgroundColor: colors.background.surfaceVariant },
        ]}
      />

      {/* Place Details */}
      <View style={styles.detailsColumn}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[styles.placeName, { color: colors.text.primary }]}>
            {place.name}
          </Text>
          <Text style={[styles.categoryBadge, { color: colors.brand.primary }]}>
            {place.categoryLabel}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <MaterialIcons color={colors.brand.yellow} name="star" size={13} />
          <Text style={[styles.ratingText, { color: colors.text.primary }]}>
            {place.rating}
          </Text>
          <Text style={[styles.reviewText, { color: colors.text.secondary }]}>
            ({place.reviewCount.toLocaleString()})
          </Text>
        </View>

        <View style={styles.addressRow}>
          <MaterialIcons color={colors.text.secondary} name="location-on" size={13} />
          <Text
            numberOfLines={1}
            style={[styles.addressText, { color: colors.text.secondary }]}>
            {place.address}
          </Text>
        </View>

        <AppText
          numberOfLines={1}
          style={[styles.openStatusText, { color: colors.state.success }]}>
          {place.openStatus}
        </AppText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  selectedCard: {
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    borderRadius: radius.input,
    height: 76,
    width: 80,
  },
  detailsColumn: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  placeName: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.xs,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  ratingText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  reviewText: {
    fontSize: typography.bodySmall,
  },
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
  },
  openStatusText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
});
