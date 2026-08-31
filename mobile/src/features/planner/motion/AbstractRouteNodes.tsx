import { Animated, StyleSheet, View } from 'react-native';

import type { ThemePalette } from '../../../theme/types';
import {
  ABSTRACT_ROUTE_NODE_FRAMES,
  ABSTRACT_ROUTE_LINE_WIDTH,
  getRouteNodeLayout,
  getRouteSegmentGeometry,
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

/** T003 route geometry is abstract, continuous, and deliberately data-free. */
export function AbstractRouteNodes({ colors, frameAnim }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.canvas}>
      {ABSTRACT_ROUTE_NODE_FRAMES.routeSegments.map((segment, index) => {
        const geometry = getRouteSegmentGeometry(index);
        if (!geometry) return null;
        const progress = interval(frameAnim, segment.start, segment.end);
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-geometry.length, 0],
        });
        return (
          <Animated.View
            key={'route-segment-' + segment.start}
            style={[
              styles.routeSegmentWindow,
              {
                height: geometry.length,
                left: geometry.left,
                top: geometry.top,
                transform: [{ rotate: `${geometry.rotationDegrees}deg` }],
              },
            ]}>
            <Animated.View
              style={[
                styles.routeSegmentFill,
                {
                  backgroundColor: colors.brand.primary,
                  height: geometry.length,
                  transform: [{ translateY }],
                },
              ]}
            />
          </Animated.View>
        );
      })}
      {ABSTRACT_ROUTE_NODE_FRAMES.nodes.map((node, index) => {
        const layout = getRouteNodeLayout(index);
        if (!layout) return null;
        const progress = interval(frameAnim, node.start, node.end);
        return (
          <Animated.View
            key={'route-node-' + node.start}
            style={[
              styles.node,
              layout,
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

const styles = StyleSheet.create({
  canvas: {
    height: 340,
    width: 320,
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
    width: ABSTRACT_ROUTE_LINE_WIDTH,
  },
  routeSegmentWindow: {
    overflow: 'hidden',
    position: 'absolute',
    width: ABSTRACT_ROUTE_LINE_WIDTH,
  },
});