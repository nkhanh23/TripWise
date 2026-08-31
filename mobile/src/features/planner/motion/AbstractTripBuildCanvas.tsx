import { Animated, StyleSheet, View } from 'react-native';

import type { ThemePalette } from '../../../theme/types';
import { AbstractActivityCards } from './AbstractActivityCards';
import { AbstractDayIndicators } from './AbstractDayIndicators';
import { AbstractRouteNodes } from './AbstractRouteNodes';
import { ABSTRACT_CANVAS_SCROLL_DISTANCE, DAY_INDICATOR_TRANSITION_END, DAY_INDICATOR_TRANSITION_START } from './dayIndicatorFrames';

type Props = {
  colors: ThemePalette;
  durationDays: number;
  frameAnim: Animated.Value;
};

function easeInOutInterval(frameAnim: Animated.Value) {
  const duration = DAY_INDICATOR_TRANSITION_END - DAY_INDICATOR_TRANSITION_START;
  return frameAnim.interpolate({
    inputRange: [
      DAY_INDICATOR_TRANSITION_START,
      DAY_INDICATOR_TRANSITION_START + duration * 0.25,
      DAY_INDICATOR_TRANSITION_START + duration * 0.5,
      DAY_INDICATOR_TRANSITION_START + duration * 0.75,
      DAY_INDICATOR_TRANSITION_END,
    ],
    outputRange: [0, 0.125, 0.5, 0.875, 1],
    extrapolate: 'clamp',
  });
}

/** Keeps the route continuous while F110–F151 replaces activity cards with staggered day cards. */
export function AbstractTripBuildCanvas({ colors, durationDays, frameAnim }: Props) {
  const transitionProgress = easeInOutInterval(frameAnim);
  const routeTranslateY = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -ABSTRACT_CANVAS_SCROLL_DISTANCE * 0.35],
  });
  const routeOpacity = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.42],
  });
  const activityTranslateY = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -ABSTRACT_CANVAS_SCROLL_DISTANCE],
  });
  const activityOpacity = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.canvas}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: routeOpacity, transform: [{ translateY: routeTranslateY }] }]}>
        <AbstractRouteNodes colors={colors} frameAnim={frameAnim} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: activityOpacity, transform: [{ translateY: activityTranslateY }] }]}>
        <AbstractActivityCards colors={colors} frameAnim={frameAnim} />
      </Animated.View>
      <AbstractDayIndicators colors={colors} durationDays={durationDays} frameAnim={frameAnim} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: 340,
    overflow: 'hidden',
    width: 320,
  },
});