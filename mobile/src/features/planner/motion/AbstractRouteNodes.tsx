import { Animated, StyleSheet, View } from 'react-native';

import type { ThemePalette } from '../../../theme/types';
import {
  ABSTRACT_ROUTE_NODE_FRAMES,
  ABSTRACT_ROUTE_SEGMENT_HEIGHT,
} from './routeNodeFrames';

type Props = {
  colors: ThemePalette;
  frameAnim: Animated.Value;
};

function interval(frameAnim: Animated.Value, start: number, end: number) {
  return frameAnim.interpolate({
    inputRange: [start, end],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
}

/**
 * T003's abstract route is intentionally data-free. It visualizes audited
 * route/node roles only; cards, days, and generated place details belong later.
 */
export function AbstractRouteNodes({ colors, frameAnim }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.canvas}>
      {ABSTRACT_ROUTE_NODE_FRAMES.routeSegments.map((segment, index) => {
        const progress = interval(frameAnim, segment.start, segment.end);
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-ABSTRACT_ROUTE_SEGMENT_HEIGHT, 0],
        });
        return (
          <Animated.View
            key={'route-segment-' + segment.start}
            style={[
              styles.routeSegmentWindow,
              ROUTE_SEGMENT_POSITIONS[index],
              { transform: [{ rotate: '42deg' }] },
            ]}>
            <Animated.View
              style={[
                styles.routeSegmentFill,
                {
                  backgroundColor: colors.brand.primary,
                  transform: [{ translateY }],
                },
              ]}
            />
          </Animated.View>
        );
      })}
      {ABSTRACT_ROUTE_NODE_FRAMES.nodes.map((node, index) => {
        const progress = interval(frameAnim, node.start, node.end);
        return (
          <Animated.View
            key={'route-node-' + node.start}
            style={[
              styles.node,
              NODE_POSITIONS[index],
              {
                backgroundColor: colors.background.surface,
                borderColor: colors.brand.primary,
                opacity: progress,
                transform: [{ scale: progress }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const ROUTE_SEGMENT_POSITIONS = [
  { left: 52, top: 8 },
  { left: 88, top: 47 },
  { left: 52, top: 86 },
] as const;

const NODE_POSITIONS = [
  { left: 44, top: 3 },
  { left: 80, top: 42 },
  { left: 44, top: 81 },
] as const;

const styles = StyleSheet.create({
  canvas: {
    height: 128,
    marginBottom: 8,
    width: 152,
  },
  node: {
    borderRadius: 10,
    borderWidth: 3,
    height: 20,
    position: 'absolute',
    width: 20,
  },
  routeSegmentFill: {
    borderRadius: 2,
    height: ABSTRACT_ROUTE_SEGMENT_HEIGHT,
    width: 3,
  },
  routeSegmentWindow: {
    height: ABSTRACT_ROUTE_SEGMENT_HEIGHT,
    overflow: 'hidden',
    position: 'absolute',
    width: 3,
  },
});