/* eslint-disable @typescript-eslint/no-require-imports */
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

import type { Route } from "../../../integration/contracts";
import { useTheme } from "../../../theme";
import type { TripMapMarkerItem } from "../types";

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
try {
  const Maps = require("react-native-maps");
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

function logPerf(
  event: string,
  metadata: Record<string, number | string> = {},
) {
  if (__DEV__) {
    console.info(`[TripWisePerf] ${event}`, {
      ...metadata,
      timestamp: performance.now(),
    });
  }
}

export const VerifiedRouteMap = memo(function VerifiedRouteMap({
  markers,
  route,
  selectedItemId,
  onSelectMarker,
}: Props) {
  const { colors } = useTheme();
  const mapRef = useRef<any>(null);
  const fitSequenceRef = useRef(0);
  logPerf("VERIFIED_MAP_RENDER");
  const points = useMemo(
    () =>
      markers.flatMap((marker) =>
        marker.verifiedCoordinate ? [marker.verifiedCoordinate] : [],
      ),
    [markers],
  );
  const routePoints = useMemo(() => route?.geometry ?? points, [points, route]);
  const hasOsrmRoute = Boolean(route?.geometry?.length);
  const markerSignature = useMemo(
    () =>
      points
        .map((point) => `${point.latitude},${point.longitude}`)
        .join("|"),
    [points],
  );
  const routeSignature = useMemo(
    () =>
      route?.geometry
        .map((point) => `${point.latitude},${point.longitude}`)
        .join("|") ?? "",
    [route],
  );
  const previousMarkerSignatureRef = useRef(markerSignature);
  const previousRouteSignatureRef = useRef<string | null>(null);
  const initialRegion = useMemo(() => {
    const source = points.length
      ? points
      : [{ latitude: 13.7563, longitude: 100.5018 }];
    const latitudes = source.map((point) => point.latitude);
    const longitudes = source.map((point) => point.longitude);
    return {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
      latitudeDelta: Math.max(
        0.04,
        Math.max(...latitudes) - Math.min(...latitudes) + 0.04,
      ),
      longitudeDelta: Math.max(
        0.04,
        Math.max(...longitudes) - Math.min(...longitudes) + 0.04,
      ),
    };
  }, [points]);

  useEffect(() => {
    if (previousMarkerSignatureRef.current === markerSignature) return;
    previousMarkerSignatureRef.current = markerSignature;
    if (!MapView || points.length === 0) return;

    const timer = setTimeout(() => {
      const fitSequence = ++fitSequenceRef.current;
      logPerf("MAP_FIT_START", {
        fitSequence,
        routeSource: "markers",
      });
      if (points.length === 1) {
        mapRef.current?.animateToRegion(
          {
            ...points[0],
            latitudeDelta: 0.04,
            longitudeDelta: 0.06,
          },
          250,
        );
      } else {
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 160, right: 48, bottom: 240, left: 48 },
          animated: true,
        });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [markerSignature, points]);

  useEffect(() => {
    if (!hasOsrmRoute) {
      previousRouteSignatureRef.current = null;
      return;
    }
    if (previousRouteSignatureRef.current === routeSignature) return;
    previousRouteSignatureRef.current = routeSignature;

    const timer = setTimeout(() => {
      const fitSequence = ++fitSequenceRef.current;
      logPerf("MAP_FIT_START", {
        fitSequence,
        routeSource: "osrm",
      });
      mapRef.current?.fitToCoordinates(routePoints, {
        edgePadding: { top: 160, right: 48, bottom: 240, left: 48 },
        animated: true,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [hasOsrmRoute, routePoints, routeSignature]);

  if (!MapView) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.surfaceVariant },
        ]}
      >
        <View style={styles.fallbackCanvas}>
          <MaterialIcons color={colors.brand.primary} name="map" size={48} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        initialRegion={initialRegion}
        onLayout={() => logPerf("MAP_LAYOUT")}
        onMapReady={() => logPerf("MAP_READY")}
        onRegionChangeComplete={() =>
          logPerf("MAP_REGION_SETTLED", {
            fitSequence: fitSequenceRef.current,
          })
        }
        ref={mapRef}
        style={StyleSheet.absoluteFill}
      >
        {markers.map((marker) =>
          marker.verifiedCoordinate ? (
            <Marker
              coordinate={marker.verifiedCoordinate}
              key={marker.item.id}
              onPress={() => onSelectMarker(marker)}
              title={`${marker.orderNumber}. ${marker.item.title}`}
            >
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.brand.primary },
                ]}
              >
                <MaterialIcons
                  color={colors.text.inverse}
                  name="location-on"
                  size={20}
                />
              </View>
            </Marker>
          ) : null,
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
  container: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  badge: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  fallbackCanvas: { alignItems: "center", flex: 1, justifyContent: "center" },
});
