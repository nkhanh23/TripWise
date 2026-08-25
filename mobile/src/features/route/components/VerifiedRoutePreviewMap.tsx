/* eslint-disable @typescript-eslint/no-require-imports */
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import type { Coordinate, Route } from "../../../integration/contracts";
import { useTheme } from "../../../theme";

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

type Props = { route: Route; stops: Coordinate[] };

export const VerifiedRoutePreviewMap = memo(function VerifiedRoutePreviewMap({
  route,
  stops,
}: Props) {
  const { colors } = useTheme();
  const mapRef = useRef<any>(null);
  const source = route.geometry.length ? route.geometry : stops;
  const latitudes = source.map((point) => point.latitude);
  const longitudes = source.map((point) => point.longitude);
  const initialRegion = {
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

  useEffect(() => {
    if (!MapView) return;
    const points = route.geometry.length >= 2 ? route.geometry : stops;
    if (points.length < 2) return;
    const timer = setTimeout(
      () =>
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 120, right: 40, bottom: 220, left: 40 },
          animated: true,
        }),
      0,
    );
    return () => clearTimeout(timer);
  }, [route, stops]);

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
        ref={mapRef}
        style={StyleSheet.absoluteFill}
      >
        {stops.map((coordinate, index) => (
          <Marker
            coordinate={coordinate}
            key={`${coordinate.latitude}:${coordinate.longitude}:${index}`}
          >
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    index === 0 ? colors.brand.primary : colors.state.error,
                },
              ]}
            >
              <MaterialIcons
                color={colors.text.inverse}
                name={index === 0 ? "trip-origin" : "location-on"}
                size={16}
              />
            </View>
          </Marker>
        ))}
        <Polyline
          coordinates={route.geometry}
          strokeColor={colors.brand.primary}
          strokeWidth={4}
        />
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  badge: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  fallbackCanvas: { alignItems: "center", flex: 1, justifyContent: "center" },
});
