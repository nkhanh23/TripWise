import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../../../theme/tokens';

type Props = {
  opacity: number;
  scale: number;
};

export const ExploreMotionHint = memo(function ExploreMotionHint({ opacity, scale }: Props) {
  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.container, { opacity, transform: [{ scale }] }]}
      testID="explore-motion-hint">
      <View style={styles.outerRing} />
      <View style={styles.innerDot} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  outerRing: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 20,
    width: 20,
  },
  innerDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 8,
    position: 'absolute',
    width: 8,
  },
});
