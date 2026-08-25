import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, typography } from "../../../theme/tokens";
import type { TripMapMarkerItem } from "../types";
import { computePolylineSegments } from "../utils/tripMapUtils";

type Props = {
  markerItems: TripMapMarkerItem[];
  selectedItemId: string | null;
  onSelectMarker: (marker: TripMapMarkerItem) => void;
  onDismissSelection: () => void;
};

export const TripMapCanvas = memo(function TripMapCanvas({
  markerItems,
  selectedItemId,
  onSelectMarker,
  onDismissSelection,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const coordinates = useMemo(
    () => markerItems.map((m) => m.coordinate),
    [markerItems],
  );

  const polylineSegments = useMemo(
    () => computePolylineSegments(coordinates),
    [coordinates],
  );

  const isDark = effectiveTheme === "dark";

  return (
    <View style={styles.canvasContainer}>
      {/* Background Interactive Map Canvas */}
      <Pressable
        accessibilityHint={t("tripMap.interactiveMap")}
        accessibilityLabel={t("tripMap.interactiveMap")}
        accessibilityRole="image"
        onPress={onDismissSelection}
        style={[
          styles.mapSurface,
          {
            backgroundColor: isDark ? "#18191E" : "#F3F2EE",
          },
        ]}
      >
        {/* River Water Feature */}
        <View
          style={[
            styles.riverCurve,
            { backgroundColor: isDark ? "#1C2E42" : "#D6E8FA" },
          ]}
        />

        {/* Road Arteries */}
        <View
          style={[
            styles.roadHorizontal1,
            { backgroundColor: isDark ? "#262830" : "#FFFFFF" },
          ]}
        />
        <View
          style={[
            styles.roadHorizontal2,
            { backgroundColor: isDark ? "#262830" : "#FFFFFF" },
          ]}
        />
        <View
          style={[
            styles.roadVertical1,
            { backgroundColor: isDark ? "#262830" : "#FFFFFF" },
          ]}
        />
        <View
          style={[
            styles.roadVertical2,
            { backgroundColor: isDark ? "#262830" : "#FFFFFF" },
          ]}
        />
        <View
          style={[
            styles.roadDiagonal,
            { backgroundColor: isDark ? "#262830" : "#FFFFFF" },
          ]}
        />

        {/* Park Patches */}
        <View
          style={[
            styles.parkPatch1,
            { backgroundColor: isDark ? "#1E2B1F" : "#E2F0D9" },
          ]}
        />
        <View
          style={[
            styles.parkPatch2,
            { backgroundColor: isDark ? "#1E2B1F" : "#E2F0D9" },
          ]}
        />
      </Pressable>

      {/* Polyline Route Segments */}
      {polylineSegments.map((segment) => (
        <View
          key={segment.id}
          style={[
            styles.polylineSegment,
            {
              backgroundColor: colors.brand.primary,
              top: `${segment.topPercent}%`,
              left: `${segment.leftPercent}%`,
              width: `${segment.lengthPercent}%`,
              transform: [{ rotate: `${segment.angleDeg}deg` }],
            },
          ]}
        />
      ))}

      {/* Numbered Itinerary Markers */}
      {markerItems.map((marker) => {
        const isSelected = marker.item.id === selectedItemId;
        const a11yLabel = isSelected
          ? t("tripMap.selectedMarkerA11y", {
              number: marker.orderNumber,
              title: marker.item.title,
            })
          : t("tripMap.markerA11y", {
              number: marker.orderNumber,
              title: marker.item.title,
            });

        return (
          <Pressable
            accessibilityHint={t("tripMap.markerA11yHint")}
            accessibilityLabel={a11yLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={marker.item.id}
            onPress={() => onSelectMarker(marker)}
            style={[
              styles.markerAnchor,
              {
                top: `${marker.coordinate.topPercent}%`,
                left: `${marker.coordinate.leftPercent}%`,
                zIndex: isSelected ? 30 : 10,
              },
            ]}
          >
            {/* Active/Selected Pulse Halo */}
            {isSelected && (
              <View
                style={[
                  styles.markerPulseHalo,
                  { backgroundColor: `${colors.brand.primary}33` },
                ]}
              />
            )}

            {/* Marker Outer Container */}
            <View
              style={[
                styles.markerOuter,
                isSelected
                  ? styles.markerOuterSelected
                  : styles.markerOuterNormal,
                {
                  backgroundColor: colors.background.surface,
                  borderColor: isSelected
                    ? colors.brand.primary
                    : colors.border.default,
                },
              ]}
            >
              {/* Inner Circle with Number */}
              <View
                style={[
                  styles.markerInner,
                  isSelected
                    ? styles.markerInnerSelected
                    : styles.markerInnerNormal,
                  {
                    backgroundColor: colors.brand.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.markerNumberText,
                    {
                      color: colors.text.inverse,
                      fontSize: isSelected ? 15 : 13,
                    },
                  ]}
                >
                  {marker.orderNumber}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  canvasContainer: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  mapSurface: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  riverCurve: {
    borderRadius: 90,
    height: "140%",
    left: "24%",
    opacity: 0.8,
    position: "absolute",
    top: "-20%",
    transform: [{ rotate: "-22deg" }],
    width: 70,
  },
  roadHorizontal1: {
    height: 12,
    left: 0,
    opacity: 0.9,
    position: "absolute",
    right: 0,
    top: "30%",
  },
  roadHorizontal2: {
    height: 14,
    left: 0,
    opacity: 0.9,
    position: "absolute",
    right: 0,
    top: "64%",
  },
  roadVertical1: {
    bottom: 0,
    left: "48%",
    opacity: 0.9,
    position: "absolute",
    top: 0,
    width: 14,
  },
  roadVertical2: {
    bottom: 0,
    left: "80%",
    opacity: 0.7,
    position: "absolute",
    top: 0,
    width: 10,
  },
  roadDiagonal: {
    height: 12,
    left: "-15%",
    opacity: 0.8,
    position: "absolute",
    top: "46%",
    transform: [{ rotate: "38deg" }],
    width: "130%",
  },
  parkPatch1: {
    borderRadius: 24,
    height: 120,
    left: "56%",
    opacity: 0.8,
    position: "absolute",
    top: "12%",
    width: 140,
  },
  parkPatch2: {
    borderRadius: 30,
    height: 100,
    left: "10%",
    opacity: 0.8,
    position: "absolute",
    top: "74%",
    width: 120,
  },
  polylineSegment: {
    borderRadius: 3,
    height: 4,
    opacity: 0.7,
    position: "absolute",
    transformOrigin: "left center",
    zIndex: 5,
  },
  markerAnchor: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    transform: [{ translateX: -22 }, { translateY: -22 }],
  },
  markerPulseHalo: {
    borderRadius: radius.pill,
    height: 52,
    position: "absolute",
    width: 52,
  },
  markerOuter: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    elevation: 4,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  markerOuterNormal: {
    height: 38,
    width: 38,
  },
  markerOuterSelected: {
    height: 44,
    width: 44,
  },
  markerInner: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
  },
  markerInnerNormal: {
    height: 30,
    width: 30,
  },
  markerInnerSelected: {
    height: 36,
    width: 36,
  },
  markerNumberText: {
    fontWeight: typography.fontWeight.bold,
    textAlign: "center",
  },
});
