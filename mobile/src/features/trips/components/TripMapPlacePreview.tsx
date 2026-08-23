import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { ItineraryItem, TripMapMarkerItem } from '../types';

type Props = {
  selectedMarker: TripMapMarkerItem;
  onPressItem?: (item: ItineraryItem) => void;
  onPressDirections?: (item: ItineraryItem) => void;
};

export const TripMapPlacePreview = memo(function TripMapPlacePreview({
  selectedMarker,
  onPressItem,
  onPressDirections,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const { item, orderNumber } = selectedMarker;
  const timeFormatted = item.timePeriod
    ? `${item.time} ${item.timePeriod}`
    : item.time;

  const subtitleText =
    item.subtitle ||
    item.description ||
    (item.durationMinutes
      ? t('tripMap.durationStay', {
          duration: `${item.durationMinutes}m`,
        })
      : '');

  const locationText =
    item.location ||
    item.subtitle ||
    t('tripMap.walkFromPrevious', { duration: '12 min' });

  return (
    <View
      style={[
        styles.bottomContainer,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
      ]}>
      {/* Grabber Handle */}
      <View
        style={[
          styles.grabber,
          { backgroundColor: colors.border.default },
        ]}
      />

      {/* Place Preview Card */}
      <Pressable
        accessibilityHint="View place details"
        accessibilityLabel={`${item.title}, ${timeFormatted}`}
        accessibilityRole="button"
        onPress={() => onPressItem?.(item)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.background.surfaceVariant,
          },
          pressed && styles.pressed,
        ]}>
        {/* Thumbnail Image + Order Badge */}
        <View
          style={[
            styles.imageContainer,
            { backgroundColor: colors.border.subtle },
          ]}>
          {item.imageUrl ? (
            <Image
              resizeMode="cover"
              source={{ uri: item.imageUrl }}
              style={styles.image}
            />
          ) : (
            <View style={styles.placeholderIcon}>
              <MaterialIcons
                color={colors.brand.primary}
                name={item.iconName || 'place'}
                size={32}
              />
            </View>
          )}

          {/* Top-left Order Badge */}
          <View
            style={[
              styles.orderBadge,
              { backgroundColor: colors.brand.primary },
            ]}>
            <Text
              style={[
                styles.orderBadgeText,
                { color: colors.text.inverse },
              ]}>
              {orderNumber}
            </Text>
          </View>
        </View>

        {/* Content Description */}
        <View style={styles.contentContainer}>
          {/* Header Row: Title & Time */}
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.titleText,
                { color: colors.text.primary },
              ]}>
              {item.title}
            </Text>
            {timeFormatted ? (
              <View
                style={[
                  styles.timeBadge,
                  { backgroundColor: `${colors.brand.primary}18` },
                ]}>
                <Text
                  style={[
                    styles.timeBadgeText,
                    { color: colors.brand.primary },
                  ]}>
                  {timeFormatted}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Subtitle / Stay Duration */}
          {subtitleText ? (
            <Text
              numberOfLines={1}
              style={[
                styles.subtitleText,
                { color: colors.text.secondary },
              ]}>
              {subtitleText}
            </Text>
          ) : null}

          {/* Walk / Location Info */}
          <View style={styles.metaRow}>
            <MaterialIcons
              color={colors.text.muted}
              name="directions-walk"
              size={15}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.metaText,
                { color: colors.text.muted },
              ]}>
              {locationText}
            </Text>
          </View>
        </View>

        {/* Action Button: Directions */}
        <Pressable
          accessibilityHint="Get directions to this place"
          accessibilityLabel={t('tripMap.getDirections')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onPressDirections?.(item)}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: `${colors.brand.primary}15`,
            },
            pressed && styles.pressed,
          ]}>
          <MaterialIcons
            color={colors.brand.primary}
            name="directions"
            size={22}
          />
        </Pressable>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  bottomContainer: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: 1,
    bottom: 0,
    elevation: 8,
    left: 0,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    zIndex: 40,
  },
  grabber: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.sm,
    width: 40,
  },
  card: {
    alignItems: 'center',
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
  },
  imageContainer: {
    borderRadius: radius.input,
    height: 72,
    overflow: 'hidden',
    position: 'relative',
    width: 72,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholderIcon: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  orderBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 20,
    justifyContent: 'center',
    left: 4,
    position: 'absolute',
    top: 4,
    width: 20,
  },
  orderBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  contentContainer: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleText: {
    flex: 1,
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  timeBadge: {
    borderRadius: radius.sm,
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  subtitleText: {
    fontSize: 12,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
