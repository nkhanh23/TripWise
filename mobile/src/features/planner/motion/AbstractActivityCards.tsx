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

/**
 * T004 cards are semantic geometric placeholders only. They intentionally
 * contain no places, labels, coordinates, ratings, or provider metadata.
 */
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
            <View style={[styles.primaryLine, { backgroundColor: colors.text.secondary }]} />
            <View style={[styles.secondaryLine, { backgroundColor: colors.text.muted }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const CARD_POSITIONS = [
  { left: 64, top: 10 },
  { left: 12, top: 50 },
  { left: 64, top: 90 },
] as const;

const styles = StyleSheet.create({
  accent: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  card: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    height: 26,
    paddingHorizontal: 7,
    position: 'absolute',
    width: 76,
  },
  primaryLine: {
    borderRadius: 2,
    height: 4,
    width: 27,
  },
  secondaryLine: {
    borderRadius: 2,
    height: 4,
    width: 14,
  },
});