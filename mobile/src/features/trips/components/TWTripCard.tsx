import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme';
import { ImageAttribution } from '../../images/components/ImageAttribution';
import { getResolvedImageSource } from '../../images/resolvedImageSource';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { TripSummary } from '../types';

type Props = {
  trip: TripSummary;
  onPress: (tripId: string) => void;
};

export const TWTripCard = memo(function TWTripCard({ trip, onPress }: Props) {
  const { colors, effectiveTheme } = useTheme();
  const isPrimaryBadge = trip.statusBadgeVariant === 'primary';

  return (
    <Pressable
      accessibilityHint="Xem chi tiết hành trình chuyến đi"
      accessibilityLabel={`${trip.title}, ${trip.destination}, ${trip.dateLabel}`}
      accessibilityRole="button"
      onPress={() => onPress(trip.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
        pressed && styles.pressed,
      ]}>
      {/* Decorative Top-Right Corner Circle */}
      <View
        style={[
          styles.decorativeCorner,
          {
            backgroundColor:
              effectiveTheme === 'dark'
                ? 'rgba(0, 88, 188, 0.15)'
                : 'rgba(0, 88, 188, 0.05)',
          },
        ]}
      />

      {/* Header Row: Status Badge & Title + More Icon */}
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          {trip.statusBadgeText ? (
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: isPrimaryBadge
                    ? colors.brand.primary
                    : colors.background.surfaceVariant,
                },
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: isPrimaryBadge
                      ? colors.text.inverse
                      : colors.text.secondary,
                  },
                ]}>
                {trip.statusBadgeText}
              </Text>
            </View>
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.titleText, { color: colors.text.primary }]}>
            {trip.title}
          </Text>
        </View>

        <View style={styles.moreButton}>
          <MaterialIcons color={colors.text.secondary} name="more-vert" size={20} />
        </View>
      </View>

      {trip.coverImageUrl ? (
        <View style={styles.coverContainer}>
          <Image
            accessibilityLabel={`${trip.title} cover photo`}
            resizeMode="cover"
            source={getResolvedImageSource(trip.coverImageUrl, trip.coverImage)}
            style={styles.coverImage}
          />
          <ImageAttribution attribution={trip.coverImage?.attribution} />
        </View>
      ) : null}

      {/* Metadata Row: Date & Location */}
      <View style={styles.metadataRow}>
        <View style={styles.metaItem}>
          <MaterialIcons color={colors.text.secondary} name="calendar-today" size={14} />
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>
            {trip.dateLabel}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <MaterialIcons color={colors.text.secondary} name="location-on" size={14} />
          <Text
            numberOfLines={1}
            style={[styles.metaText, { color: colors.text.secondary }]}>
            {trip.destination}
          </Text>
        </View>
      </View>

      {/* Footer Row: Traveler Avatars + Action Link */}
      <View
        style={[
          styles.footerRow,
          { borderTopColor: colors.border.default },
        ]}>
        {/* Avatars Stack */}
        <View style={styles.avatarsStack}>
          {trip.travelers?.map((traveler, index) => (
            <View
              key={traveler.id}
              style={[
                styles.avatarCircle,
                {
                  backgroundColor:
                    traveler.colorVariant === 'tertiary'
                      ? effectiveTheme === 'dark'
                        ? '#5C1D1D'
                        : '#FFDAD5'
                      : effectiveTheme === 'dark'
                      ? '#1E354D'
                      : '#D8E4F2',
                  borderColor: colors.background.surface,
                  marginLeft: index === 0 ? 0 : -8,
                },
              ]}>
              <Text
                style={[
                  styles.avatarInitials,
                  {
                    color:
                      traveler.colorVariant === 'tertiary'
                        ? effectiveTheme === 'dark'
                          ? '#FFDAD5'
                          : '#410001'
                        : effectiveTheme === 'dark'
                        ? '#D8E4F2'
                        : '#111D26',
                  },
                ]}>
                {traveler.initials}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Link with Arrow */}
        <View style={styles.actionLinkRow}>
          <Text style={[styles.actionLinkText, { color: colors.brand.primary }]}>
            {trip.actionLabel ?? 'View Itinerary'}
          </Text>
          <MaterialIcons
            color={colors.brand.primary}
            name="arrow-forward"
            size={16}
          />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  coverContainer: {
    position: 'relative',
  },
  card: {
    borderRadius: radius.input, // 8px matching Stitch rounded-lg
    borderWidth: 1,
    elevation: 2,
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  decorativeCorner: {
    borderBottomLeftRadius: 64,
    height: 64,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 64,
  },
  coverImage: {
    borderRadius: radius.input,
    height: 96,
    marginBottom: spacing.md,
    width: '100%',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    zIndex: 2,
  },
  titleColumn: {
    flex: 1,
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  badgePill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  titleText: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  moreButton: {
    padding: 2,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
    zIndex: 2,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  metaText: {
    fontSize: typography.bodySmall,
  },
  footerRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    zIndex: 2,
  },
  avatarsStack: {
    flexDirection: 'row',
  },
  avatarCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  actionLinkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
