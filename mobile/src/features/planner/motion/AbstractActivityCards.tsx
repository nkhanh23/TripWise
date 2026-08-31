import { Animated, StyleSheet, View } from 'react-native';

import type { ThemePalette } from '../../../theme/types';
import {
  ABSTRACT_ACTIVITY_CARD_FRAMES,
  ABSTRACT_ACTIVITY_CARD_OFFSET_X,
  ABSTRACT_ACTIVITY_CARD_OFFSET_Y,
} from './activityCardFrames';

type Props = {
  colors: ThemePalette;
  frameAnim: Animated.Value;
};

function easedInterval(frameAnim: Animated.Value, start: number, end: number) {
  const duration = end - start;
  return frameAnim.interpolate({
    inputRange: [start, start + duration * 0.25, start + duration * 0.5, start + duration * 0.75, end],
    outputRange: [0, 0.4375, 0.75, 0.9375, 1],
    extrapolate: 'clamp',
  });
}

/** T004 cards are abstract hierarchy markers; no places, labels, or provider data. */
export function AbstractActivityCards({ colors, frameAnim }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}>
      {ABSTRACT_ACTIVITY_CARD_FRAMES.map((card, index) => {
        const progress = easedInterval(frameAnim, card.start, card.end);
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [card.direction === 'right' ? ABSTRACT_ACTIVITY_CARD_OFFSET_X : -ABSTRACT_ACTIVITY_CARD_OFFSET_X, 0],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [card.translatesUp ? ABSTRACT_ACTIVITY_CARD_OFFSET_Y : 0, 0],
        });
        return (
          <Animated.View
            key={'abstract-activity-card-' + card.start}
            style={[
              styles.card,
              CARD_POSITIONS[index],
              {
                backgroundColor: colors.background.surfaceVariant,
                borderColor: colors.border.subtle,
                opacity: progress,
                transform: [{ translateX }, { translateY }],
              },
            ]}>
            <View style={[styles.accent, { backgroundColor: colors.brand.primary }]} />
            <View style={styles.copyBlock}>
              <View style={[styles.primaryLine, { backgroundColor: colors.text.secondary }]} />
              <View style={[styles.secondaryLine, { backgroundColor: colors.text.muted }]} />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const CARD_POSITIONS = [
  { left: 176, top: 46 },
  { left: 10, top: 138 },
  { left: 176, top: 232 },
] as const;

const styles = StyleSheet.create({
  accent: {
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  card: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 64,
    paddingHorizontal: 12,
    position: 'absolute',
    width: 134,
  },
  copyBlock: {
    gap: 8,
  },
  primaryLine: {
    borderRadius: 2,
    height: 5,
    width: 62,
  },
  secondaryLine: {
    borderRadius: 2,
    height: 4,
    width: 42,
  },
});