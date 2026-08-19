"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { type MapAdapter } from "@/lib/mapAdapter";
import { MarkerLayer } from "@/lib/markerLayer";
import { RouteLayer } from "@/lib/routeLayer";
import { useMapCamera } from "@/hooks/useMapCamera";
import {
  getRoute,
  type ItineraryDayResponse,
  type RouteRequest,
} from "@/lib/api";
import styles from "./TripLeafletMap.module.css";

// ── Types ───────────────────────────────────────────────────────────────────

type MapStop = {
  id: string;
  orderIndex: number;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  timeLabel: string;
  transportMode?: string;
};

export interface TripMapLibreMapProps {
  activeDayData: ItineraryDayResponse | undefined;
  selectedItemIndex: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [109.1967, 12.2388]; // [lng, lat]

function mapTransportModeToProfile(mode?: string): RouteRequest["profile"] {
  switch (mode?.trim().toUpperCase()) {
    case "WALK":
      return "walking";
    case "BIKE":
    case "BICYCLE":
    case "CYCLING":
      return "cycling";
    default:
      return "driving";
  }
}

function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  const coordinates: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

/** Parse OSRM geometry string → [lng, lat][] for MapLibre */
function parseGeometryToLngLat(geometry: string): [number, number][] {
  if (!geometry) return [];
  const trimmed = geometry.trim();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === "LineString" && Array.isArray(parsed.coordinates)) {
        return parsed.coordinates.filter(
          (c: any): c is [number, number] =>
            Array.isArray(c) && c.length >= 2 && typeof c[0] === "number" && typeof c[1] === "number"
        );
      }
    } catch {}
  }

  try {
    const decoded5 = decodePolyline(trimmed, 5);
    const isValid =
      decoded5.length > 0 &&
      decoded5.every(([latV, lngV]) => latV > -90 && latV < 90 && lngV > -180 && lngV < 180);
    const latLngArr =
      isValid && decoded5.length > 0 && Math.abs(decoded5[0][0]) > 0.1
        ? decoded5
        : decodePolyline(trimmed, 6);
    // Swap [lat, lng] → [lng, lat] for MapLibre
    return latLngArr.map(([latV, lngV]) => [lngV, latV]);
  } catch {
    return [];
  }
}

function formatTimeLabel(item: ItineraryDayResponse["items"][number]): string {
  if (item.startTime && item.endTime) {
    return `${item.startTime.slice(0, 5)} - ${item.endTime.slice(0, 5)}`;
  }
  if (item.startTime) return item.startTime.slice(0, 5);
  if (item.timeSlot) {
    const mapped: Record<string, string> = {
      MORNING: "Buổi sáng",
      NOON: "Buổi trưa",
      AFTERNOON: "Buổi chiều",
      EVENING: "Buổi tối",
    };
    return mapped[item.timeSlot] ?? item.timeSlot;
  }
  return "Linh hoạt";
}

// ── Component ────────────────────────────────────────────────────────────────

export function TripMapLibreMap({ activeDayData, selectedItemIndex }: TripMapLibreMapProps) {
  const [mapAdapter, setMapAdapter] = useState<MapAdapter | null>(null);
  const markerLayer = useMemo(
    () => (mapAdapter ? new MarkerLayer(mapAdapter) : null),
    [mapAdapter]
  );
  const routeLayer = useMemo(
    () => (mapAdapter ? new RouteLayer(mapAdapter) : null),
    [mapAdapter]
  );
  const cameraController = useMapCamera(mapAdapter);

  const handleMapLoad = useCallback((adapter: MapAdapter) => {
    setMapAdapter(adapter);
  }, []);

  // Derive stops from activeDayData
  const stops = useMemo((): MapStop[] => {
    if (!activeDayData) return [];
    return activeDayData.items
      .filter(
        (item) =>
          typeof item.place?.latitude === "number" &&
          typeof item.place?.longitude === "number"
      )
      .map((item) => ({
        id: `${activeDayData.dayNumber}-${item.orderIndex}`,
        orderIndex: item.orderIndex,
        latitude: item.place!.latitude as number,
        longitude: item.place!.longitude as number,
        title: item.place?.name || `Điểm ${item.orderIndex + 1}`,
        subtitle: item.place?.city || "",
        timeLabel: formatTimeLabel(item),
        transportMode: item.transportSuggestion?.mode,
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [activeDayData]);

  const selectedStop = stops.find((s) => s.orderIndex === selectedItemIndex) ?? null;

  // ── Effect: draw markers + routes when day changes ───────────────────────
  useEffect(() => {
    if (!mapAdapter || !markerLayer || !routeLayer) return;
    let active = true;

    async function draw() {
      if (!mapAdapter || !markerLayer || !routeLayer) return;

      // 1. Clear previous state
      markerLayer.clearMarkers();
      routeLayer.clearRoutes();

      if (stops.length === 0) return;

      // 2. Draw markers
      stops.forEach((stop, idx) => {
        markerLayer.addMarker({
          id: stop.id,
          center: [stop.longitude, stop.latitude],
          label: String(idx + 1),
          title: stop.title,
          type: idx === 0 ? "origin" : "place",
          selected: stop.orderIndex === selectedItemIndex,
          active: false,
        });
      });

      // 3. Camera
      if (stops.length === 1) {
        cameraController.jumpTo({ center: [stops[0].longitude, stops[0].latitude], zoom: 14 });
      } else {
        const lats = stops.map((s) => s.latitude);
        const lngs = stops.map((s) => s.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        if (!isNaN(minLat) && !isNaN(maxLat) && !isNaN(minLng) && !isNaN(maxLng)) {
          cameraController.fitBounds({
            bounds: [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            padding: 60,
          });
        }
      }

      // 4. Load OSRM routes
      if (stops.length >= 2) {
        const segmentPromises = stops.slice(1).map(async (stop, idx) => {
          const origin = stops[idx];
          const profile = mapTransportModeToProfile(stop.transportMode);
          try {
            const response = await getRoute({
              originLat: origin.latitude,
              originLng: origin.longitude,
              destLat: stop.latitude,
              destLng: stop.longitude,
              profile,
            });
            const coords = parseGeometryToLngLat(response.geometry);
            return {
              id: `${origin.id}--${stop.id}`,
              coordinates:
                coords.length >= 2
                  ? coords
                  : ([[origin.longitude, origin.latitude], [stop.longitude, stop.latitude]] as [number, number][]),
              isFallback: coords.length < 2,
            };
          } catch {
            return {
              id: `${origin.id}--${stop.id}`,
              coordinates: [
                [origin.longitude, origin.latitude],
                [stop.longitude, stop.latitude],
              ] as [number, number][],
              isFallback: true,
            };
          }
        });

        const segments = await Promise.all(segmentPromises);
        if (!active) return;

        segments.forEach((seg) => {
          routeLayer.addRoute({
            id: seg.id,
            coordinates: seg.coordinates,
            color: "#111111",
            width: seg.isFallback ? 4 : 5,
            opacity: seg.isFallback ? 0.55 : 0.8,
          });
        });
      }
    }

    void draw();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapAdapter, markerLayer, routeLayer, activeDayData]);

  // ── Effect: highlight selected marker + route segment when selectedItemIndex changes ──
  useEffect(() => {
    if (!mapAdapter || !markerLayer || !routeLayer) return;

    // Update marker selected state
    stops.forEach((stop) => {
      markerLayer.updateMarker(stop.id, {
        selected: stop.orderIndex === selectedItemIndex,
        active: false,
      });
    });

    // Highlight the route segment leading INTO the selected stop
    if (selectedItemIndex !== null && selectedItemIndex > 0) {
      const prevStop = stops.find((s) => s.orderIndex === selectedItemIndex - 1);
      const currStop = stops.find((s) => s.orderIndex === selectedItemIndex);
      if (prevStop && currStop) {
        routeLayer.highlightSegment(
          [
            [prevStop.longitude, prevStop.latitude],
            [currStop.longitude, currStop.latitude],
          ],
          "#E6392E",
          7
        );
      }
    } else {
      // First stop selected or none: clear highlight
      routeLayer.clearHighlightSegment();
    }
  }, [mapAdapter, markerLayer, routeLayer, stops, selectedItemIndex]);

  // ── Effect: camera fly-to selected stop ─────────────────────────────────
  useEffect(() => {
    if (!selectedStop || !mapAdapter) return;
    // Cancel any queued animation before starting a new one
    cameraController.cancelActiveTransitions();
    cameraController.flyTo({
      center: [selectedStop.longitude, selectedStop.latitude],
      zoom: 15,
      duration: 800,
    });
  }, [selectedStop, mapAdapter, cameraController]);

  // Derive route status label
  const routeStatusLabel = stops.length < 2
    ? "Cần ít nhất 2 điểm"
    : "Đang tải tuyến đường...";

  return (
    <div className={styles.mapShell}>
      {/* MapCanvas is the sole WebGL owner — reuses same context across day switches */}
      <MapCanvas
        className="w-full h-full border-none rounded-none min-h-0"
        center={DEFAULT_CENTER}
        zoom={12}
        onMapLoad={handleMapLoad}
      />

      {/* Retro HUD overlay */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 1000,
          pointerEvents: "none",
          maxWidth: "220px",
        }}
      >
        <div
          style={{
            background: "#FFFDF3",
            border: "3px solid #111111",
            borderRadius: "4px",
            boxShadow: "4px 4px 0px #111111",
            padding: "10px 14px",
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}
        >
          {selectedStop ? (
            <>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#888",
                  marginBottom: "4px",
                }}
              >
                Ngày {activeDayData?.dayNumber} · Điểm #{selectedStop.orderIndex + 1}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#111111",
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                }}
              >
                {selectedStop.title}
              </div>
              {selectedStop.subtitle ? (
                <div style={{ fontSize: "11px", color: "#555", marginTop: "3px" }}>
                  {selectedStop.subtitle}
                </div>
              ) : null}
              {selectedStop.timeLabel ? (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#e6392e",
                    fontWeight: 600,
                    marginTop: "4px",
                  }}
                >
                  {selectedStop.timeLabel}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#888",
                  marginBottom: "4px",
                }}
              >
                Ngày {activeDayData?.dayNumber ?? "–"}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#111111" }}>
                {stops.length} điểm dừng
              </div>
              {stops.length < 1 && (
                <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                  {routeStatusLabel}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {stops.length === 0 ? (
        <div className={styles.emptyOverlay}>
          Không có tọa độ hợp lệ để vẽ marker cho ngày này.
        </div>
      ) : null}
    </div>
  );
}
