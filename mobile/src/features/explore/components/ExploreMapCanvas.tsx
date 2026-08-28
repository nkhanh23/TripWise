/* eslint-disable @typescript-eslint/no-require-imports */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import type { ClusterMarkerModel, ExploreMapPlace, ExploreMarkerItem, ExploreUIStatus } from '../types';
import { ExploreClusterMarker } from './ExploreClusterMarker';
import { ExploreMarker } from './ExploreMarker';
import { ExploreMotionHint } from './ExploreMotionHint';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = undefined;
try {
  if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  }
} catch {
  MapView = null;
}

type Props = {
  markersDimmed: boolean;
  status: ExploreUIStatus;
  markerItems: ExploreMarkerItem[];
  selectedPlaceId: string | null;
  onMovementStateChange: (moving: boolean) => void;
  onSelectPlace: (place: ExploreMapPlace) => void;
  onSelectCluster?: (cluster: ClusterMarkerModel) => void;
  onDismissSelection: () => void;
  onRegionChangeComplete?: (region: ExploreMapRegion, details?: ExploreRegionChangeDetails) => void;
};

export type ExploreMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type ExploreRegionChangeDetails = { isGesture?: boolean };

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
  dimmed,
}: {
  onPress?: () => void;
  place: ExploreMapPlace;
  selected: boolean;
  dimmed: boolean;
}) {
  const isInteractive = onPress !== undefined;

  return (
    <Pressable
      accessibilityLabel={place.name}
      accessibilityRole={isInteractive ? 'button' : undefined}
      accessibilityState={{
        disabled: !isInteractive,
        selected,
      }}
      disabled={!isInteractive}
      onPress={onPress}
      style={[styles.nativeMarkerWrap, dimmed && styles.dimmedMarkerWrap]}>
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

function ClusterPin({ cluster, dimmed }: { cluster: ClusterMarkerModel; dimmed: boolean }) {
  return (
    <View style={[styles.clusterCircle, dimmed && styles.dimmedClusterCircle]}>
      <Text style={styles.countText}>{cluster.count}</Text>
    </View>
  );
}

export const ExploreMapCanvas = memo(function ExploreMapCanvas({
  status,
  markersDimmed,
  onMovementStateChange,
  markerItems,
  selectedPlaceId,
  onSelectPlace,
  onSelectCluster,
  onDismissSelection,
  onRegionChangeComplete,
}: Props) {
  const { t } = useTranslation();
  const movingRef = useRef(false);
  const markerCoordinates = useMemo(
    () =>
      markerItems.map((item) => ({
        item,
        coordinate: item.type === 'place' ? item.place.coordinate : item.coordinate,
      })),
    [markerItems]
  );
  const [currentRegion, setCurrentRegion] = useState<ExploreMapRegion>(INITIAL_EXPLORE_REGION);

  const handleMovementStart = useCallback(() => {
    if (movingRef.current) return;
    movingRef.current = true;
    onMovementStateChange(true);
  }, [onMovementStateChange]);

  const handlePanDrag = useCallback(() => {
    handleMovementStart();
  }, [handleMovementStart]);

  const handleRegionChange = useCallback(() => {
    handleMovementStart();
  }, [handleMovementStart]);

  const handleRegionChangeComplete = useCallback(
    (region: ExploreMapRegion, details?: ExploreRegionChangeDetails) => {
      setCurrentRegion(region);
      movingRef.current = false;
      onMovementStateChange(false);
      if (onRegionChangeComplete) onRegionChangeComplete(region, details);
    },
    [onMovementStateChange, onRegionChangeComplete]
  );

  const hints = useMemo(() => {
    if (status !== 'moving') return [];
    return buildExplorationHints(currentRegion);
  }, [currentRegion, status]);

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
              dimmed={markersDimmed || (selectedPlaceId !== null && item.place.id !== selectedPlaceId)}
              disabled={markersDimmed}
              isSelected={item.place.id === selectedPlaceId}
              key={item.place.id}
              onPress={markersDimmed ? undefined : onSelectPlace}
              place={item.place}
            />
          ) : (
            <ExploreClusterMarker
              cluster={item}
              dimmed={markersDimmed || (selectedPlaceId !== null && item.places.every((place) => place.id !== selectedPlaceId))}
              disabled={markersDimmed}
              key={item.id}
              onPress={
                markersDimmed
                  ? undefined
                  : (cluster) =>
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
        onLayout={() => {
          if (__DEV__) console.info('[ExploreMapCanvas] layout ready');
        }}
        onMapReady={() => {
          if (__DEV__) console.info('[ExploreMapCanvas] map ready');
        }}
        onPanDrag={handlePanDrag}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        pitchEnabled={false}
        provider={PROVIDER_GOOGLE}
        rotateEnabled={false}
        scrollEnabled
        style={StyleSheet.absoluteFill}
        zoomControlEnabled
        zoomEnabled>
        {hints.map((hint) => (
          <Marker
            accessibilityElementsHidden
            accessible={false}
            calloutEnabled={false}
            coordinate={hint.coordinate}
            importantForAccessibility="no-hide-descendants"
            key={hint.id}
            tracksViewChanges={false}>
            <ExploreMotionHint opacity={hint.opacity} scale={hint.scale} />
          </Marker>
        ))}
        {validMarkerCoordinates.map(({ item, coordinate }) =>
          item.type === 'place' ? (
            <Marker
              calloutEnabled={false}
              coordinate={coordinate}
              key={item.place.id}
              onPress={markersDimmed ? undefined : () => onSelectPlace(item.place)}
              tracksViewChanges={item.place.id === selectedPlaceId}>
              <MarkerPin
                dimmed={markersDimmed || (selectedPlaceId !== null && item.place.id !== selectedPlaceId)}
                onPress={markersDimmed ? undefined : () => onSelectPlace(item.place)}
                place={item.place}
                selected={item.place.id === selectedPlaceId}
              />
            </Marker>
          ) : (
            <Marker
              calloutEnabled={false}
              coordinate={coordinate}
              key={item.id}
              onPress={
                markersDimmed
                  ? undefined
                  : () =>
                      onSelectCluster ? onSelectCluster(item) : onSelectPlace(item.places[0])
              }
              tracksViewChanges={false}>
              <ClusterPin
                cluster={item}
                dimmed={markersDimmed || (selectedPlaceId !== null && item.places.every((place) => place.id !== selectedPlaceId))}
              />
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
  nativeMarkerWrap: {
    alignItems: 'center',
  },
  dimmedMarkerWrap: {
    opacity: 0.45,
    transform: [{ scale: 0.96 }],
  },
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
  pinOuterDefault: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  pinOuterSelected: {
    borderColor: colors.brand.red,
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  pinInner: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  pinInnerDefault: {
    backgroundColor: colors.brand.primary,
  },
  pinInnerSelected: {
    backgroundColor: colors.brand.red,
  },
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
  pinPointDefault: {
    borderTopColor: '#FFFFFF',
  },
  pinPointSelected: {
    borderTopColor: colors.brand.red,
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
    width: 36,
  },
  dimmedClusterCircle: {
    opacity: 0.45,
    transform: [{ scale: 0.96 }],
  },
  countText: {
    color: colors.text.inverse,
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
});

export function buildExplorationHints(region: ExploreMapRegion) {
  return [
    { id: 'hint-1', coordinate: { latitude: region.latitude + 0.01, longitude: region.longitude + 0.01 }, opacity: 0.8, scale: 1 },
    { id: 'hint-2', coordinate: { latitude: region.latitude - 0.01, longitude: region.longitude - 0.01 }, opacity: 0.8, scale: 1 },
    { id: 'hint-3', coordinate: { latitude: region.latitude + 0.01, longitude: region.longitude - 0.01 }, opacity: 0.8, scale: 1 },
    { id: 'hint-4', coordinate: { latitude: region.latitude - 0.01, longitude: region.longitude + 0.01 }, opacity: 0.8, scale: 1 },
    { id: 'hint-5', coordinate: { latitude: region.latitude + 0.02, longitude: region.longitude }, opacity: 0.8, scale: 1 },
    { id: 'hint-6', coordinate: { latitude: region.latitude - 0.02, longitude: region.longitude }, opacity: 0.8, scale: 1 },
    { id: 'hint-7', coordinate: { latitude: region.latitude, longitude: region.longitude + 0.02 }, opacity: 0.8, scale: 1 },
    { id: 'hint-8', coordinate: { latitude: region.latitude, longitude: region.longitude - 0.02 }, opacity: 0.8, scale: 1 },
  ];
}
