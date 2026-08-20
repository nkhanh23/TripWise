import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { ExplorePlace } from '../types';

type Props = {
  place: ExplorePlace;
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
          <Text numberOfLines={1} style={[styles.placeName, { color: colors.text.primary }]}>
            {place.name}
          </Text>
          <View style={styles.metaRow}>
            <MaterialIcons color={colors.brand.yellow} name="star" size={14} />
            <Text style={[styles.ratingText, { color: colors.text.primary }]}>
              {place.rating}
            </Text>
            <Text style={[styles.reviewText, { color: colors.text.secondary }]}>
              ({place.reviewCount.toLocaleString()}+ reviews)
            </Text>
            <Text style={[styles.dotSeparator, { color: colors.text.muted }]}>•</Text>
            <Text style={[styles.categoryBadge, { color: colors.brand.primary }]}>
              {place.categoryLabel}
            </Text>
          </View>
        </Pressable>

        {/* Close Button */}
        <Pressable
          accessibilityHint="Đóng khung xem trước địa điểm"
          accessibilityLabel="Đóng"
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
        <Image
          accessibilityLabel={place.name}
          accessibilityRole="image"
          source={{ uri: place.imageUrl }}
          style={styles.thumbnail}
        />
        <View style={styles.pillsColumn}>
          <View style={[styles.pill, { backgroundColor: colors.background.surfaceVariant }]}>
            <MaterialIcons color={colors.text.secondary} name="location-on" size={14} />
            <Text numberOfLines={1} style={[styles.pillText, { color: colors.text.secondary }]}>
              {place.address}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.background.surfaceVariant }]}>
            <MaterialIcons color={colors.text.secondary} name="schedule" size={14} />
            <Text numberOfLines={1} style={[styles.pillText, { color: colors.text.secondary }]}>
              {place.openStatus}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Quick Action Buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityHint="Xem tuyến đường và chỉ đường tới địa điểm"
          accessibilityLabel="Chỉ đường"
          accessibilityRole="button"
          onPress={() => onPressDetail?.(place.id)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
          <View style={[styles.actionIconCircle, { backgroundColor: colors.brand.primary }]}>
            <MaterialIcons color={colors.text.inverse} name="navigation" size={20} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.brand.primary }]}>
            {t('explore.directions')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint="Lưu địa điểm này vào danh sách yêu thích"
          accessibilityLabel="Lưu địa điểm"
          accessibilityRole="button"
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
          accessibilityHint="Xem thông tin giá vé tham quan"
          accessibilityLabel="Vé tham quan"
          accessibilityRole="button"
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
          accessibilityHint="Chia sẻ địa điểm này cho bạn bè"
          accessibilityLabel="Chia sẻ địa điểm"
          accessibilityRole="button"
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
      <View style={styles.descriptionSection}>
        <AppText numberOfLines={2} style={styles.descriptionText}>
          {place.description}
        </AppText>
      </View>
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
    shadowColor: '#000',
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
    height: 32,
    justifyContent: 'center',
    width: 32,
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
