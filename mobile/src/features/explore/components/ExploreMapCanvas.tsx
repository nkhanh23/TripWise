/* eslint-disable @typescript-eslint/no-require-imports */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import type { ClusterMarkerModel, ExploreMapPlace, ExploreMarkerItem } from '../types';
import { ExploreClusterMarker } from './ExploreClusterMarker';
import { ExploreMarker } from './ExploreMarker';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = undefined;
try {
  if (Platform.OS !== 'web' && !process.env.JEST_WORKER_ID) {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  }
} catch {
  MapView = null;
}

type Props = {
  markerItems: ExploreMarkerItem[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: ExploreMapPlace) => void;
  onSelectCluster?: (cluster: ClusterMarkerModel) => void;
  onDismissSelection: () => void;
  onRegionChangeComplete?: (region: ExploreMapRegion) => void;
};

export type ExploreMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const INITIAL_EXPLORE_REGION: ExploreMapRegion = {
  latitude: 13.76,
  longitude: 100.52,
  latitudeDelta: 0.14,
  longitudeDelta: 0.22,
};

function isValidCoordinate(coordinate: { latitude: number; longitude: number }) {
  return (
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
}

function MarkerPin({
  onPress,
  place,
  selected,
}: {
  onPress: () => void;
  place: ExploreMapPlace;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={place.name}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.nativeMarkerWrap}>
      {selected ? (
        <View style={styles.nameBadge}>
          <Text numberOfLines={1} style={styles.nameBadgeText}>
            {place.name}
          </Text>
        </View>
      ) : null}
      <View style={[styles.pinOuter, selected ? styles.pinOuterSelected : styles.pinOuterDefault]}>
        <View style={[styles.pinInner, selected ? styles.pinInnerSelected : styles.pinInnerDefault]}>
          <MaterialIcons color="#FFFFFF" name={place.iconName} size={14} />
        </View>
      </View>
      <View style={[styles.pinPoint, selected ? styles.pinPointSelected : styles.pinPointDefault]} />
    </Pressable>
  );
}

function ClusterPin({ cluster }: { cluster: ClusterMarkerModel }) {
  return (
    <View style={styles.clusterCircle}>
      <Text style={styles.countText}>{cluster.count}</Text>
    </View>
  );
}

export const ExploreMapCanvas = memo(function ExploreMapCanvas({
  markerItems,
  selectedPlaceId,
  onSelectPlace,
  onSelectCluster,
  onDismissSelection,
  onRegionChangeComplete,
}: Props) {
  const { t } = useTranslation();
  const markerCoordinates = useMemo(
    () =>
      markerItems.map((item) => ({
        item,
        coordinate: item.type === 'place' ? item.place.coordinate : item.coordinate,
      })),
    [markerItems]
  );
  const validMarkerCoordinates = useMemo(
    () => markerCoordinates.filter(({ coordinate }) => isValidCoordinate(coordinate)),
    [markerCoordinates]
  );
  useEffect(() => {
    if (__DEV__) {
      console.info('[ExploreMapCanvas] marker diagnostics', {
        renderedMarkers: validMarkerCoordinates.length,
        validCoordinates: validMarkerCoordinates.length,
        visiblePlaces: markerItems.reduce((count, item) => count + (item.type === 'place' ? 1 : item.count), 0),
      });
    }
  }, [markerItems, validMarkerCoordinates.length]);

  if (!MapView || !Marker) {
    return (
      <View style={styles.canvasContainer}>
        <Pressable
          accessibilityHint={t('explore.mapA11yHint')}
          accessibilityLabel={t('explore.mapA11yLabel')}
          accessibilityRole="image"
          onPress={onDismissSelection}
          style={styles.fallbackSurface}
        />
        {markerItems.map((item) =>
          item.type === 'place' ? (
            <ExploreMarker
              isSelected={item.place.id === selectedPlaceId}
              key={item.place.id}
              onPress={onSelectPlace}
              place={item.place}
            />
          ) : (
            <ExploreClusterMarker
              cluster={item}
              key={item.id}
              onPress={(cluster) =>
                onSelectCluster ? onSelectCluster(cluster) : onSelectPlace(cluster.places[0])
              }
            />
          )
        )}
      </View>
    );
  }

  return (
    <View style={styles.canvasContainer}>
      <MapView
        accessibilityHint={t('explore.mapA11yHint')}
        accessibilityLabel={t('explore.mapA11yLabel')}
        initialRegion={INITIAL_EXPLORE_REGION}
        onLayout={() => { if (__DEV__) console.info('[ExploreMapCanvas] layout ready'); }}
        onMapReady={() => { if (__DEV__) console.info('[ExploreMapCanvas] map ready'); }}
        onRegionChangeComplete={onRegionChangeComplete}
        provider={PROVIDER_GOOGLE}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled
        style={StyleSheet.absoluteFill}
        zoomControlEnabled
        zoomEnabled>
        {validMarkerCoordinates.map(({ item, coordinate }) =>
          item.type === 'place' ? (
            <Marker
              calloutEnabled={false}
              coordinate={coordinate}
              key={item.place.id}
              onPress={() => onSelectPlace(item.place)}
              tracksViewChanges={item.place.id === selectedPlaceId}>
              <MarkerPin
                onPress={() => onSelectPlace(item.place)}
                place={item.place}
                selected={item.place.id === selectedPlaceId}
              />
            </Marker>
          ) : (
            <Marker
              calloutEnabled={false}
              coordinate={coordinate}
              key={item.id}
              onPress={() =>
                onSelectCluster ? onSelectCluster(item) : onSelectPlace(item.places[0])
              }
              tracksViewChanges={false}>
              <ClusterPin cluster={item} />
            </Marker>
          )
        )}
      </MapView>
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
  },
  fallbackSurface: {
    backgroundColor: '#F3F2EE',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  nativeMarkerWrap: { alignItems: 'center' },
  nameBadge: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.input,
    elevation: 4,
    marginBottom: 4,
    maxWidth: 180,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  nameBadgeText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  pinOuter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    elevation: 3,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pinOuterDefault: { borderColor: '#FFFFFF', borderWidth: 2 },
  pinOuterSelected: { borderColor: colors.brand.red, borderWidth: 2.5, transform: [{ scale: 1.15 }] },
  pinInner: { alignItems: 'center', borderRadius: radius.pill, height: 24, justifyContent: 'center', width: 24 },
  pinInnerDefault: { backgroundColor: colors.brand.primary },
  pinInnerSelected: { backgroundColor: colors.brand.red },
  pinPoint: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 5,
    borderRightColor: 'transparent',
    borderRightWidth: 5,
    borderTopWidth: 6,
    height: 0,
    marginTop: -2,
    width: 0,
  },
  pinPointDefault: { borderTopColor: '#FFFFFF' },
  pinPointSelected: { borderTopColor: colors.brand.red },
  clusterCircle: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderColor: '#FFFFFF',
    borderRadius: radius.pill,
    borderWidth: 2.5,
    elevation: 4,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  countText: { color: colors.text.inverse, fontSize: typography.bodySmall, fontWeight: typography.fontWeight.bold },
});
