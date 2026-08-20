import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ClusterMarkerModel, ExploreMarkerItem, ExplorePlace } from '../types';
import { ExploreClusterMarker } from './ExploreClusterMarker';
import { ExploreMarker } from './ExploreMarker';

type Props = {
  markerItems: ExploreMarkerItem[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: ExplorePlace) => void;
  onSelectCluster?: (cluster: ClusterMarkerModel) => void;
  onDismissSelection: () => void;
};

export const ExploreMapCanvas = memo(function ExploreMapCanvas({
  markerItems,
  selectedPlaceId,
  onSelectPlace,
  onSelectCluster,
  onDismissSelection,
}: Props) {
  return (
    <View style={styles.canvasContainer}>
      {/* Background vector styling simulating map canvas tiles */}
      <Pressable
        accessibilityHint="Bấm vào khoảng trống để bỏ chọn địa điểm"
        accessibilityLabel="Bản đồ tương tác"
        accessibilityRole="image"
        onPress={onDismissSelection}
        style={styles.mapSurface}>
        {/* Simulated River/Water body */}
        <View style={styles.riverCurve} />
        {/* Simulated Road Arteries */}
        <View style={styles.roadHorizontal1} />
        <View style={styles.roadHorizontal2} />
        <View style={styles.roadVertical1} />
        <View style={styles.roadVertical2} />
        <View style={styles.roadDiagonal} />
        {/* Simulated Green park patches */}
        <View style={styles.parkPatch1} />
        <View style={styles.parkPatch2} />
      </Pressable>

      {/* Markers Layer */}
      {markerItems.map((item) => {
        if (item.type === 'place') {
          return (
            <ExploreMarker
              isSelected={item.place.id === selectedPlaceId}
              key={item.place.id}
              onPress={onSelectPlace}
              place={item.place}
            />
          );
        }

        return (
          <ExploreClusterMarker
            cluster={item}
            key={item.id}
            onPress={(cluster) =>
              onSelectCluster ? onSelectCluster(cluster) : onSelectPlace(cluster.places[0])
            }
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  canvasContainer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#F3F2EE',
    overflow: 'hidden',
  },
  mapSurface: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  riverCurve: {
    backgroundColor: '#D6E8FA',
    borderRadius: 80,
    height: '140%',
    left: '28%',
    opacity: 0.85,
    position: 'absolute',
    top: '-20%',
    transform: [{ rotate: '-25deg' }],
    width: 60,
  },
  roadHorizontal1: {
    backgroundColor: '#FFFFFF',
    height: 10,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: '32%',
  },
  roadHorizontal2: {
    backgroundColor: '#FFFFFF',
    height: 14,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: '65%',
  },
  roadVertical1: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: '52%',
    opacity: 0.9,
    position: 'absolute',
    top: 0,
    width: 12,
  },
  roadVertical2: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: '78%',
    opacity: 0.7,
    position: 'absolute',
    top: 0,
    width: 8,
  },
  roadDiagonal: {
    backgroundColor: '#FFFFFF',
    height: 12,
    left: '-20%',
    opacity: 0.8,
    position: 'absolute',
    top: '48%',
    transform: [{ rotate: '40deg' }],
    width: '140%',
  },
  parkPatch1: {
    backgroundColor: '#E2F0D9',
    borderRadius: 24,
    height: 110,
    left: '58%',
    opacity: 0.75,
    position: 'absolute',
    top: '16%',
    width: 130,
  },
  parkPatch2: {
    backgroundColor: '#E2F0D9',
    borderRadius: 30,
    height: 90,
    left: '12%',
    opacity: 0.75,
    position: 'absolute',
    top: '72%',
    width: 110,
  },
});
