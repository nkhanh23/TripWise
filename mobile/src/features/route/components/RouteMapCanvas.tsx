import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import type { MockRouteData } from '../types';

type Props = {
  route: MockRouteData;
};

export const RouteMapCanvas = memo(function RouteMapCanvas({ route }: Props) {
  const { origin, destination } = route.geometry;

  return (
    <View
      accessibilityLabel={`Bản đồ lộ trình từ ${origin.name} đến ${destination.name}`}
      accessibilityRole="image"
      style={styles.canvasContainer}>
      {/* Simulated Map Arteries */}
      <View style={styles.riverCurve} />
      <View style={styles.road1} />
      <View style={styles.road2} />
      <View style={styles.roadDiagonal} />
      <View style={styles.parkPatch} />

      {/* Simulated Route Polyline Segments */}
      <View style={styles.routePolylineSegment1} />
      <View style={styles.routePolylineSegment2} />

      {/* Origin Marker */}
      <View
        style={[
          styles.markerWrap,
          {
            top: `${origin.topPercent}%`,
            left: `${origin.leftPercent}%`,
          },
        ]}>
        <View style={styles.originCircleOuter}>
          <View style={styles.originCircleInner} />
        </View>
        <View style={styles.markerBadge}>
          <Text style={styles.markerBadgeText}>{origin.name}</Text>
        </View>
      </View>

      {/* Destination Marker */}
      <View
        style={[
          styles.markerWrap,
          {
            top: `${destination.topPercent}%`,
            left: `${destination.leftPercent}%`,
          },
        ]}>
        <View style={styles.destPinOuter}>
          <MaterialIcons color="#BC000A" name="location-on" size={28} />
        </View>
        <View style={[styles.markerBadge, styles.destBadge]}>
          <Text style={styles.markerBadgeText}>{destination.name}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  canvasContainer: {
    backgroundColor: '#EBE7E2',
    height: 280,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  riverCurve: {
    backgroundColor: '#D6E8FA',
    borderRadius: 80,
    height: '140%',
    left: '18%',
    opacity: 0.85,
    position: 'absolute',
    top: '-20%',
    transform: [{ rotate: '-20deg' }],
    width: 60,
  },
  road1: {
    backgroundColor: '#FFFFFF',
    height: 12,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: '40%',
  },
  road2: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: '48%',
    opacity: 0.9,
    position: 'absolute',
    top: 0,
    width: 14,
  },
  roadDiagonal: {
    backgroundColor: '#FFFFFF',
    height: 10,
    left: '-10%',
    opacity: 0.7,
    position: 'absolute',
    top: '60%',
    transform: [{ rotate: '35deg' }],
    width: '120%',
  },
  parkPatch: {
    backgroundColor: '#E2F0D9',
    borderRadius: 20,
    height: 80,
    left: '52%',
    opacity: 0.8,
    position: 'absolute',
    top: '15%',
    width: 100,
  },
  routePolylineSegment1: {
    backgroundColor: colors.brand.primary,
    borderRadius: 3,
    height: 6,
    left: '35%',
    opacity: 0.95,
    position: 'absolute',
    top: '55%',
    transform: [{ rotate: '-35deg' }],
    width: '26%',
    zIndex: 5,
  },
  routePolylineSegment2: {
    backgroundColor: colors.brand.primary,
    borderRadius: 3,
    height: 6,
    left: '52%',
    opacity: 0.95,
    position: 'absolute',
    top: '36%',
    transform: [{ rotate: '-22deg' }],
    width: '22%',
    zIndex: 5,
  },
  markerWrap: {
    alignItems: 'center',
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 10,
  },
  originCircleOuter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    elevation: 4,
    height: 28,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 28,
  },
  originCircleInner: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    height: 12,
    width: 12,
  },
  destPinOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBadge: {
    backgroundColor: 'rgba(28, 27, 27, 0.85)',
    borderRadius: radius.pill,
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  destBadge: {
    backgroundColor: 'rgba(188, 0, 10, 0.88)',
  },
  markerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
});
