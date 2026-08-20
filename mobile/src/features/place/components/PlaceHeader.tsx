import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../theme';
import { radius, spacing } from '../../../theme/tokens';

type Props = {
  isSaved: boolean;
  onToggleSave: () => void;
  onBack: () => void;
  onShare?: () => void;
};

export const PlaceHeader = memo(function PlaceHeader({
  isSaved,
  onToggleSave,
  onBack,
  onShare,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();

  return (
    <View style={[styles.headerContainer, { top: Math.max(insets.top, spacing.sm) }]}>
      {/* Back button */}
      <Pressable
        accessibilityHint="Quay lại màn hình trước"
        accessibilityLabel="Quay lại"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [
          styles.circleButton,
          {
            backgroundColor:
              effectiveTheme === 'dark'
                ? 'rgba(30, 31, 36, 0.9)'
                : 'rgba(255, 255, 255, 0.9)',
          },
          pressed && styles.pressed,
        ]}>
        <MaterialIcons color={colors.text.primary} name="arrow-back" size={20} />
      </Pressable>

      {/* Right action group */}
      <View style={styles.rightGroup}>
        {onShare ? (
          <Pressable
            accessibilityHint="Chia sẻ địa điểm này"
            accessibilityLabel="Chia sẻ"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onShare}
            style={({ pressed }) => [
              styles.circleButton,
              {
                backgroundColor:
                  effectiveTheme === 'dark'
                    ? 'rgba(30, 31, 36, 0.9)'
                    : 'rgba(255, 255, 255, 0.9)',
              },
              pressed && styles.pressed,
            ]}>
            <MaterialIcons color={colors.text.primary} name="share" size={20} />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityHint="Lưu hoặc bỏ lưu địa điểm này"
          accessibilityLabel={isSaved ? 'Đã lưu địa điểm' : 'Lưu địa điểm'}
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          hitSlop={8}
          onPress={onToggleSave}
          style={({ pressed }) => [
            styles.circleButton,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(30, 31, 36, 0.9)'
                  : 'rgba(255, 255, 255, 0.9)',
            },
            isSaved && [
              styles.savedCircleButton,
              {
                backgroundColor: colors.background.surfaceVariant,
                borderColor: colors.brand.primary,
              },
            ],
            pressed && styles.pressed,
          ]}>
          <MaterialIcons
            color={isSaved ? colors.brand.primary : colors.text.primary}
            name={isSaved ? 'bookmark' : 'bookmark-border'}
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    zIndex: 50,
  },
  rightGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  circleButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 4,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    width: 40,
  },
  savedCircleButton: {
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
