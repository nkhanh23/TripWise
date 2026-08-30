import { Animated, StyleSheet, View } from 'react-native';

import type { ThemePalette } from '../../../theme/types';
import {
  ABSTRACT_DAY_INDICATOR_FRAMES,
  ABSTRACT_DAY_INDICATOR_OFFSET_Y,
  getBoundedDayIndicatorCount,
} from './dayIndicatorFrames';

type Props = {
  colors: ThemePalette;
  durationDays: number;
  frameAnim: Animated.Value;
};

function easeOutInterval(frameAnim: Animated.Value, start: number, end: number) {
  const duration = end - start;
  return frameAnim.interpolate({
    inputRange: [start, start + duration * 0.25, start + duration * 0.5, start + duration * 0.75, end],
    outputRange: [0, 0.4375, 0.75, 0.9375, 1],
    extrapolate: 'clamp',
  });
}

/** T005 uses duration only as a bounded density signal; it never displays itinerary data. */
export function AbstractDayIndicators({ colors, durationDays, frameAnim }: Props) {
  const indicatorCount = getBoundedDayIndicatorCount(durationDays);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}>
      {ABSTRACT_DAY_INDICATOR_FRAMES.slice(0, indicatorCount).map((indicator, index) => {
        const progress = easeOutInterval(frameAnim, indicator.start, indicator.end);
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [ABSTRACT_DAY_INDICATOR_OFFSET_Y, 0],
        });
        return (
          <Animated.View
            key={'abstract-day-indicator-' + indicator.start}
            style={[
              styles.indicator,
              INDICATOR_POSITIONS[index],
              {
                backgroundColor: colors.background.surfaceVariant,
                borderColor: colors.border.default,
                opacity: progress,
                transform: [{ translateY }],
              },
            ]}>
            <View style={[styles.rail, { backgroundColor: colors.brand.primary }]} />
            <View style={[styles.primaryMark, { backgroundColor: colors.text.secondary }]} />
            <View style={[styles.secondaryMark, { backgroundColor: colors.text.muted }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const INDICATOR_POSITIONS = [
  { left: 18, top: 26 },
  { left: 18, top: 57 },
  { left: 18, top: 88 },
] as const;

const styles = StyleSheet.create({
  indicator: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 24,
    paddingHorizontal: 8,
    position: 'absolute',
    width: 116,
  },
  primaryMark: {
    borderRadius: 2,
    height: 4,
    width: 42,
  },
  rail: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  secondaryMark: {
    borderRadius: 2,
    height: 4,
    width: 24,
  },
});