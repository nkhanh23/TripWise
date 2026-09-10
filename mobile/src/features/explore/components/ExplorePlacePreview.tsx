import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { ExploreMapPlace } from '../types';

type Props = {
  place: ExploreMapPlace;
  onClose: () => void;
  onPressDetail?: (placeId: string) => void;
};

export const ExplorePlacePreview = memo(function ExplorePlacePreview({
  place,
  onClose,
  onPressDetail,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const handleUnavailableAction = () => {
    Alert.alert(t('common.unavailableTitle'), t('common.unavailableMessage'));
  };

  return (
    <View
      style={[
        styles.sheetContainer,
        {
          backgroundColor: colors.background.surface,
          borderTopColor: colors.border.default,
        },
      ]}>
      {/* Grabber handle */}
      <View style={[styles.grabber, { backgroundColor: colors.border.default }]} />

      {/* Header Info */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityHint={t('explore.viewDetails')}
          accessibilityLabel={`${place.name}`}
          accessibilityRole="button"
          onPress={() => onPressDetail?.(place.id)}
          style={styles.titleInfo}>
          {/* Review Required Badge */}
          <View
            accessibilityLabel={t('intelligence.reviewRequired')}
            accessibilityRole="text"
            style={[styles.reviewBadge, { backgroundColor: colors.background.surfaceVariant, borderColor: colors.border.default }]}>
            <MaterialIcons color={colors.text.secondary} name="rate-review" size={12} />
            <Text style={[styles.reviewBadgeText, { color: colors.text.secondary }]}>
              {t('intelligence.reviewRequired')}
            </Text>
          </View>

          <Text numberOfLines={1} style={[styles.placeName, { color: colors.text.primary }]}>
            {place.name}
          </Text>
          <View style={styles.metaRow}>
            {place.rating !== undefined ? (
              <>
                <MaterialIcons color={colors.brand.yellow} name="star" size={14} />
                <Text style={[styles.ratingText, { color: colors.text.primary }]}>
                  {place.rating}
                </Text>
                {place.reviewCount !== undefined ? (
                  <Text style={[styles.reviewText, { color: colors.text.secondary }]}>
                    {t('place.reviewCount', { count: place.reviewCount.toLocaleString() })}
                  </Text>
                ) : null}
                <Text style={[styles.dotSeparator, { color: colors.text.muted }]}>•</Text>
              </>
            ) : null}
            <Text style={[styles.categoryBadge, { color: colors.brand.primary }]}>
              {place.categoryLabel}
            </Text>
          </View>
        </Pressable>

        {/* Close Button */}
        <Pressable
          accessibilityHint={t('explore.closePreviewHint')}
          accessibilityLabel={t('common.close')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: colors.background.surfaceVariant },
            pressed && styles.closeButtonPressed,
          ]}>
          <MaterialIcons color={colors.text.primary} name="close" size={18} />
        </Pressable>
      </View>

      {/* Thumbnail + Context Info */}
      <Pressable
        accessibilityHint={t('explore.viewDetails')}
        accessibilityLabel={place.name}
        accessibilityRole="button"
        onPress={() => onPressDetail?.(place.id)}
        style={styles.contentRow}>
        {place.imageUrl ? (
          <Image
            accessibilityLabel={place.name}
            accessibilityRole="image"
            source={{ uri: place.imageUrl }}
            style={styles.thumbnail}
          />
        ) : (
          <View
            accessibilityLabel={t('place.imageUnavailable')}
            style={[
              styles.thumbnail,
              styles.thumbnailPlaceholder,
              { backgroundColor: colors.background.surfaceVariant },
            ]}>
            <MaterialIcons color={colors.text.muted} name="place" size={26} />
          </View>
        )}
        <View style={styles.pillsColumn}>
          {place.address ? (
            <View style={[styles.pill, { backgroundColor: colors.background.surfaceVariant }]}>
              <MaterialIcons color={colors.text.secondary} name="location-on" size={14} />
              <Text numberOfLines={1} style={[styles.pillText, { color: colors.text.secondary }]}>
                {place.address}
              </Text>
            </View>
          ) : null}
          {place.openStatus ? (
            <View style={[styles.pill, { backgroundColor: colors.background.surfaceVariant }]}>
              <MaterialIcons color={colors.text.secondary} name="schedule" size={14} />
              <Text numberOfLines={1} style={[styles.pillText, { color: colors.text.secondary }]}>
                {place.openStatus}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Quick Action Buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityHint={t('place.directionsHint')}
          accessibilityLabel={t('place.getDirections')}
          accessibilityRole="button"
          onPress={handleUnavailableAction}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
          <View style={[styles.actionIconCircle, { backgroundColor: colors.brand.primary }]}>
            <MaterialIcons color={colors.text.inverse} name="navigation" size={20} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.brand.primary }]}>
            {t('explore.directions')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint={t('common.unavailableMessage')}
          accessibilityLabel={t('common.save')}
          accessibilityRole="button"
          onPress={handleUnavailableAction}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
          <View
            style={[
              styles.actionIconCircle,
              { backgroundColor: colors.background.surfaceVariant },
            ]}>
            <MaterialIcons color={colors.text.secondary} name="bookmark-border" size={20} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>
            {t('common.save')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint={t('common.unavailableMessage')}
          accessibilityLabel={t('place.entryFee')}
          accessibilityRole="button"
          onPress={handleUnavailableAction}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
          <View
            style={[
              styles.actionIconCircle,
              { backgroundColor: colors.background.surfaceVariant },
            ]}>
            <MaterialIcons color={colors.text.secondary} name="confirmation-number" size={20} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>
            {t('place.entryFee')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint={t('common.unavailableMessage')}
          accessibilityLabel={t('common.share')}
          accessibilityRole="button"
          onPress={handleUnavailableAction}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
          <View
            style={[
              styles.actionIconCircle,
              { backgroundColor: colors.background.surfaceVariant },
            ]}>
            <MaterialIcons color={colors.text.secondary} name="share" size={20} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>
            {t('common.share')}
          </Text>
        </Pressable>
      </View>

      {/* Description Snippet */}
      {place.description ? (
        <View style={styles.descriptionSection}>
          <AppText numberOfLines={2} style={styles.descriptionText}>
            {place.description}
          </AppText>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    bottom: 0,
    elevation: 8,
    gap: spacing.sm,
    left: 0,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 40,
  },
  grabber: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.xs,
    width: 40,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleInfo: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },
  reviewBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  placeName: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  reviewText: {
    fontSize: typography.bodySmall,
  },
  dotSeparator: {
    fontSize: typography.bodySmall,
  },
  categoryBadge: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  contentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: 2,
  },
  thumbnail: {
    borderRadius: radius.input,
    height: 64,
    width: 80,
  },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  pillsColumn: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  pill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: typography.bodySmall,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  actionIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  descriptionSection: {
    marginTop: 2,
  },
  descriptionText: {
    fontSize: typography.bodySmall,
    lineHeight: 18,
  },
});
