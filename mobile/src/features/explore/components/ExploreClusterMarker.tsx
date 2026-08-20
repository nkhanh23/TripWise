import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '../../../theme/tokens';
import type { ClusterMarkerModel } from '../types';

type Props = {
  cluster: ClusterMarkerModel;
  onPress: (cluster: ClusterMarkerModel) => void;
};

export const ExploreClusterMarker = memo(function ExploreClusterMarker({ cluster, onPress }: Props) {
  return (
    <View
      style={[
        styles.container,
        {
          top: `${cluster.mapCoordinate.topPercent}%`,
          left: `${cluster.mapCoordinate.leftPercent}%`,
        },
      ]}>
      <Pressable
        accessibilityHint={`Nhấn để xem ${cluster.count} địa điểm trong khu vực này`}
        accessibilityLabel={`${cluster.count} địa điểm trong khu vực này`}
        accessibilityRole="button"
        onPress={() => onPress(cluster)}
        style={({ pressed }) => [styles.touchTarget, pressed && styles.pressed]}>
        <View style={styles.clusterCircle}>
          <Text style={styles.countText}>{cluster.count}</Text>
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'absolute',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    zIndex: 15,
  },
  touchTarget: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  clusterCircle: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderColor: '#FFFFFF',
    borderRadius: radius.pill,
    borderWidth: 2.5,
    elevation: 4,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 36,
  },
  countText: {
    color: colors.text.inverse,
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
