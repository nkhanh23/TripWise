import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { PlaceDetailData } from '../types';

type Props = {
  place: PlaceDetailData;
  onPress: (placeId: string) => void;
};

export const TWPlaceCard = memo(function TWPlaceCard({ place, onPress }: Props) {
  const { colors, effectiveTheme } = useTheme();

  return (
    <Pressable
      accessibilityHint={`Xem chi tiết địa điểm ${place.name}`}
      accessibilityLabel={`${place.name}, ${place.categoryLabel}, đánh giá ${place.rating} sao`}
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
      {/* Thumbnail */}
      <Image
        accessibilityLabel={place.name}
        accessibilityRole="image"
        source={{ uri: place.heroImageUrl }}
        style={[
          styles.thumbnail,
          { backgroundColor: colors.background.surfaceVariant },
        ]}
      />

      {/* Info Column */}
      <View style={styles.infoColumn}>
        <View style={styles.headerRow}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: colors.text.primary }]}>
            {place.name}
          </Text>
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: effectiveTheme === 'dark' ? '#332914' : '#FFF4E5' },
            ]}>
            <MaterialIcons color={colors.brand.yellow} name="star" size={12} />
            <Text style={[styles.ratingValue, { color: colors.brand.yellow }]}>
              {place.rating}
            </Text>
          </View>
        </View>

        <Text style={[styles.categoryText, { color: colors.brand.primary }]}>
          {place.categoryLabel}
        </Text>

        <View style={styles.locationRow}>
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
    elevation: 3,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  thumbnail: {
    borderRadius: radius.input,
    height: 80,
    width: 86,
  },
  infoColumn: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.xs,
  },
  ratingBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  locationRow: {
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
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
