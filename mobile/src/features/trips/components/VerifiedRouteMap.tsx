/* eslint-disable @typescript-eslint/no-require-imports */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Route } from '../../../integration/contracts';
import { useTheme } from '../../../theme';
import type { TripMapMarkerItem } from '../types';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default || Maps;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
} catch {
  MapView = null;
}

type Props = {
  markers: TripMapMarkerItem[];
  route: Route | null;
  selectedItemId: string | null;
  onSelectMarker: (marker: TripMapMarkerItem) => void;
};

export const VerifiedRouteMap = memo(function VerifiedRouteMap({
  markers,
  route,
  selectedItemId,
  onSelectMarker,
}: Props) {
  const { colors } = useTheme();
  const mapRef = useRef<any>(null);
  const points = useMemo(
    () =>
      markers.flatMap((marker) =>
        marker.verifiedCoordinate ? [marker.verifiedCoordinate] : []
      ),
    [markers]
  );
  const routePoints = useMemo(() => route?.geometry ?? points, [points, route]);
  const initialRegion = useMemo(() => {
    const source = points.length ? points : [{ latitude: 13.7563, longitude: 100.5018 }];
    const latitudes = source.map((point) => point.latitude);
    const longitudes = source.map((point) => point.longitude);
    return {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
      latitudeDelta: Math.max(0.04, Math.max(...latitudes) - Math.min(...latitudes) + 0.04),
      longitudeDelta: Math.max(0.04, Math.max(...longitudes) - Math.min(...longitudes) + 0.04),
    };
  }, [points]);

  useEffect(() => {
    if (!MapView || points.length === 0) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(routePoints, {
        edgePadding: { top: 160, right: 48, bottom: 240, left: 48 },
        animated: true,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [routePoints, points.length]);

  if (!MapView) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.surfaceVariant },
        ]}>
        <View style={styles.fallbackCanvas}>
          <MaterialIcons color={colors.brand.primary} name="map" size={48} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView initialRegion={initialRegion} ref={mapRef} style={StyleSheet.absoluteFill}>
        {markers.map((marker) =>
          marker.verifiedCoordinate ? (
            <Marker
              coordinate={marker.verifiedCoordinate}
              key={marker.item.id}
              onPress={() => onSelectMarker(marker)}
              title={`${marker.orderNumber}. ${marker.item.title}`}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.brand.primary },
                ]}>
                <MaterialIcons
                  color={colors.text.inverse}
                  name="location-on"
                  size={20}
                />
              </View>
            </Marker>
          ) : null
        )}
        {routePoints.length >= 2 ? (
          <Polyline
            coordinates={routePoints}
            strokeColor={colors.brand.primary}
            strokeWidth={4}
          />
        ) : null}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  badge: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fallbackCanvas: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
