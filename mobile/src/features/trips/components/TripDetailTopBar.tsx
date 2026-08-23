import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  title?: string;
  topInset: number;
  onBack: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onMap?: () => void;
};

export const TripDetailTopBar = memo(function TripDetailTopBar({
  title = 'TripWise',
  topInset,
  onBack,
  onEdit,
  onShare,
  onMap,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            effectiveTheme === 'dark'
              ? 'rgba(19, 20, 24, 0.92)'
              : 'rgba(252, 249, 248, 0.92)',
          borderBottomColor: colors.border.subtle,
          paddingTop: Math.max(topInset, spacing.xs),
        },
      ]}>
      <View style={styles.contentRow}>
        {/* Back Button */}
        <Pressable
          accessibilityHint={t('common.back')}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(30, 31, 36, 0.9)'
                  : 'rgba(255, 255, 255, 0.9)',
            },
            pressed && styles.pressed,
          ]}>
          <MaterialIcons color={colors.brand.primary} name="arrow-back" size={22} />
        </Pressable>

        {/* Center Title */}
        <View style={styles.centerTitleContainer}>
          <Text
            numberOfLines={1}
            style={[styles.titleText, { color: colors.brand.primary }]}>
            {title}
          </Text>
        </View>

        {/* Trailing Action Buttons */}
        <View style={styles.actionsRow}>
          {onMap ? (
            <Pressable
              accessibilityHint={t('tripDetail.viewMap')}
              accessibilityLabel={t('tripDetail.viewMap')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onMap}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor:
                    effectiveTheme === 'dark'
                      ? 'rgba(30, 31, 36, 0.9)'
                      : 'rgba(255, 255, 255, 0.9)',
                },
                pressed && styles.pressed,
              ]}>
              <MaterialIcons color={colors.brand.primary} name="map" size={20} />
            </Pressable>
          ) : null}

          {onShare ? (
            <Pressable
              accessibilityHint="Share"
              accessibilityLabel="Share"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onShare}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor:
                    effectiveTheme === 'dark'
                      ? 'rgba(30, 31, 36, 0.9)'
                      : 'rgba(255, 255, 255, 0.9)',
                },
                pressed && styles.pressed,
              ]}>
              <MaterialIcons color={colors.brand.primary} name="share" size={20} />
            </Pressable>
          ) : null}

          {onEdit ? (
            <Pressable
              accessibilityHint="Edit"
              accessibilityLabel="Edit"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onEdit}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor:
                    effectiveTheme === 'dark'
                      ? 'rgba(30, 31, 36, 0.9)'
                      : 'rgba(255, 255, 255, 0.9)',
                },
                pressed && styles.pressed,
              ]}>
              <MaterialIcons color={colors.brand.primary} name="edit" size={20} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.5,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
  contentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 2,
    height: 38,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    width: 38,
  },
  centerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  titleText: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
