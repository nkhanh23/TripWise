"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap
} from "react-leaflet";
import L, {
  type DivIcon,
  type LatLngExpression,
  type LatLngTuple
} from "leaflet";
import styles from "./TripLeafletMap.module.css";
import {
  getRoute,
  type ItineraryDayResponse,
  type RouteRequest
} from "@/lib/api";

type MapStop = {
  id: string;
  dayNumber: number;
  orderIndex: number;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  category?: string;
  timeLabel: string;
  transportMode?: string;
  selected: boolean;
};

type RouteSegment = {
  id: string;
  profile: RouteRequest["profile"];
  positions: LatLngTuple[];
  isFallback: boolean;
};

export interface TripLeafletMapProps {
  activeDayData: ItineraryDayResponse | undefined;
  selectedItemIndex: number | null;
}

const DEFAULT_CENTER: LatLngExpression = [12.2388, 109.1967];

function formatTimeLabel(item: ItineraryDayResponse["items"][number]) {
  if (item.startTime && item.endTime) {
    return `${item.startTime.slice(0, 5)} - ${item.endTime.slice(0, 5)}`;
  }

  if (item.startTime) {
    return item.startTime.slice(0, 5);
  }

  if (item.timeSlot) {
    const mapped: Record<string, string> = {
      MORNING: "Buoi sang",
      NOON: "Buoi trua",
      AFTERNOON: "Buoi chieu",
      EVENING: "Buoi toi"
    };

    return mapped[item.timeSlot] ?? item.timeSlot;
  }

  return "Linh hoat";
}

function createStopIcon(stop: MapStop): DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="${styles.markerOuter} ${stop.selected ? styles.markerOuterSelected : ""}">
        <div class="${styles.markerCore}">
          <span class="${styles.markerNumber}">${stop.orderIndex + 1}</span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -30]
  });
}

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

function buildFallbackLine(origin: MapStop, destination: MapStop): LatLngTuple[] {
  return [
    [origin.latitude, origin.longitude],
    [destination.latitude, destination.longitude]
  ];
}

function decodePolyline(encoded: string, precision = 5): LatLngTuple[] {
  const factor = Math.pow(10, precision);
  const coordinates: LatLngTuple[] = [];
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

function parseGeometryPositions(geometry: string): LatLngTuple[] {
  if (!geometry) {
    return [];
  }

  const trimmed = geometry.trim();

  // Thử parse nếu là GeoJSON
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        type?: string;
        coordinates?: number[][];
      };

      if (parsed.type === "LineString" && Array.isArray(parsed.coordinates)) {
        return parsed.coordinates
          .filter(
            (coordinate): coordinate is [number, number] =>
              Array.isArray(coordinate) &&
              coordinate.length >= 2 &&
              typeof coordinate[0] === "number" &&
              typeof coordinate[1] === "number"
          )
          .map(([longitude, latitude]) => [latitude, longitude]);
      }
    } catch {
      // Bỏ qua và chuyển sang decode
    }
  }

  // Thử giải mã nếu là Encoded Polyline
  try {
    const decoded5 = decodePolyline(trimmed, 5);
    const isValid = decoded5.length > 0 && decoded5.every(([lat, lng]) => lat > -90 && lat < 90 && lng > -180 && lng < 180);
    if (isValid && decoded5.length > 0 && Math.abs(decoded5[0][0]) > 0.1) {
      return decoded5;
    }
    return decodePolyline(trimmed, 6);
  } catch {
    return [];
  }
}

function MapViewportController({
  stops,
  selectedStop
}: {
  stops: MapStop[];
  selectedStop?: MapStop;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedStop) {
      map.flyTo([selectedStop.latitude, selectedStop.longitude], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.8
      });
      return;
    }

    if (stops.length === 0) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }

    if (stops.length === 1) {
      map.setView([stops[0].latitude, stops[0].longitude], 14);
      return;
    }

    const bounds = L.latLngBounds(
      stops.map((stop) => [stop.latitude, stop.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.8 });
  }, [map, selectedStop, stops]);

  return null;
}

function MapControls() {
  const map = useMap();

  return (
    <div className={styles.mapControls}>
      <button
        className={styles.controlButton}
        onClick={() => map.zoomIn()}
        type="button"
      >
        +
      </button>
      <button
        className={styles.controlButton}
        onClick={() => map.zoomOut()}
        type="button"
      >
        -
      </button>
      <button
        className={styles.controlButton}
        onClick={() => map.setView(DEFAULT_CENTER, 12)}
        type="button"
      >
        O
      </button>
    </div>
  );
}

export function TripLeafletMap({
  activeDayData,
  selectedItemIndex
}: TripLeafletMapProps) {
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "fallback">(
    "idle"
  );
  
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  useEffect(() => {
    if (selectedItemIndex !== null && activeDayData) {
      // stop.id = `${dayNumber}-${orderIndex}`, align with stops useMemo
      const targetId = `${activeDayData.dayNumber}-${selectedItemIndex}`;
      const marker = markerRefs.current[targetId];
      if (marker) {
        const timer = setTimeout(() => {
          marker.openPopup();
        }, 120);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedItemIndex, activeDayData]);

  const stops = useMemo(() => {
    if (!activeDayData) {
      return [];
    }

    // Structured Logging
    console.debug("[TripLeafletMap] Processing stops for Day:", activeDayData.dayNumber, {
      itemCount: activeDayData.items.length,
      items: activeDayData.items.map((item) => ({
        orderIndex: item.orderIndex,
        placeName: item.place?.name,
        latitude: item.place?.latitude,
        longitude: item.place?.longitude
      }))
    });

    return activeDayData.items
      .filter(
        (item) =>
          typeof item.place?.latitude === "number" &&
          typeof item.place?.longitude === "number"
      )
      .map((item) => ({
        id: `${activeDayData.dayNumber}-${item.orderIndex}`,
        dayNumber: activeDayData.dayNumber,
        orderIndex: item.orderIndex,
        title: item.place?.name || `Stop ${item.orderIndex + 1}`,
        subtitle: item.place?.city || "TripWise stop",
        latitude: item.place?.latitude as number,
        longitude: item.place?.longitude as number,
        category: item.place?.categoryName,
        timeLabel: formatTimeLabel(item),
        transportMode: item.transportSuggestion?.mode,
        selected: item.orderIndex === selectedItemIndex
      }))
      .sort((left, right) => left.orderIndex - right.orderIndex);
  }, [activeDayData, selectedItemIndex]);

  const selectedStop = stops.find((stop) => stop.selected);

  useEffect(() => {
    let active = true;

    async function loadRouteSegments() {
      if (stops.length < 2) {
        setRouteSegments([]);
        setRouteStatus("idle");
        return;
      }

      setRouteStatus("loading");

      const requests = stops.slice(1).map(async (stop, index) => {
        const origin = stops[index];
        const profile = mapTransportModeToProfile(stop.transportMode);

        try {
          const response = await getRoute({
            originLat: origin.latitude,
            originLng: origin.longitude,
            destLat: stop.latitude,
            destLng: stop.longitude,
            profile
          });

          const positions = parseGeometryPositions(response.geometry);
          return {
            id: `${origin.id}-${stop.id}`,
            profile,
            positions:
              positions.length >= 2 ? positions : buildFallbackLine(origin, stop),
            isFallback: positions.length < 2
          };
        } catch {
          return {
            id: `${origin.id}-${stop.id}`,
            profile,
            positions: buildFallbackLine(origin, stop),
            isFallback: true
          };
        }
      });

      const results = await Promise.all(requests);
      if (!active) {
        return;
      }

      const usedFallback = results.some((segment) => segment.isFallback);
      setRouteSegments(results);
      setRouteStatus(usedFallback ? "fallback" : "ready");
    }

    void loadRouteSegments();

    return () => {
      active = false;
    };
  }, [stops]);

  const selectedSegmentId = useMemo(() => {
    if (selectedItemIndex === null || selectedItemIndex <= 0) {
      return null;
    }

    const previousStop = stops.find((stop) => stop.orderIndex === selectedItemIndex - 1);
    const currentStop = stops.find((stop) => stop.orderIndex === selectedItemIndex);

    if (!previousStop || !currentStop) {
      return null;
    }

    return `${previousStop.id}-${currentStop.id}`;
  }, [selectedItemIndex, stops]);

  const routeStatusLabel = useMemo(() => {
    switch (routeStatus) {
      case "loading":
        return "Dang tai route";
      case "fallback":
        return "Dang dung line fallback";
      case "ready":
        return "OSRM polyline san sang";
      default:
        return stops.length > 1 ? "Chua nap route" : "Can it nhat 2 stop";
    }
  }, [routeStatus, stops.length]);

  return (
    <div className={styles.mapShell}>
      <MapContainer
        center={DEFAULT_CENTER}
        className={styles.mapCanvas}
        zoom={12}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewportController selectedStop={selectedStop} stops={stops} />
        <MapControls />

        {routeSegments.map((segment) => (
          <Polyline
            key={segment.id}
            pathOptions={{
              color: segment.id === selectedSegmentId ? "#e6392e" : "#111111",
              opacity: segment.id === selectedSegmentId ? 0.95 : 0.72,
              weight: segment.id === selectedSegmentId ? 7 : 5,
              lineCap: "round",
              lineJoin: "round",
              dashArray: segment.isFallback ? "10 12" : undefined
            }}
            positions={segment.positions}
          />
        ))}

        {stops.map((stop) => (
          <Marker
            icon={createStopIcon(stop)}
            key={stop.id}
            position={[stop.latitude, stop.longitude]}
            ref={(ref) => {
              markerRefs.current[stop.id] = ref;
            }}
          >
            <Popup>
              <div className={styles.popupBody}>
                <strong>{stop.title}</strong>
                <span>{stop.subtitle}</span>
                <span>{`Day ${stop.dayNumber} | ${stop.timeLabel}`}</span>
                {stop.category ? <span>{stop.category}</span> : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ── Floating Retro Cartoon HUD ── */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 1000,
          pointerEvents: "none",
          maxWidth: "220px"
        }}
      >
        <div
          style={{
            background: "#FFFDF3",
            border: "3px solid #111111",
            borderRadius: "4px",
            boxShadow: "4px 4px 0px #111111",
            padding: "10px 14px",
            fontFamily: "'Outfit', 'Inter', sans-serif"
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
                  marginBottom: "4px"
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
                  wordBreak: "break-word"
                }}
              >
                {selectedStop.title}
              </div>
              {selectedStop.subtitle ? (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginTop: "3px"
                  }}
                >
                  {selectedStop.subtitle}
                </div>
              ) : null}
              {selectedStop.timeLabel ? (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#e6392e",
                    fontWeight: 600,
                    marginTop: "4px"
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
                  marginBottom: "4px"
                }}
              >
                Ngày {activeDayData?.dayNumber ?? "–"}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#111111"
                }}
              >
                {stops.length} điểm dừng
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#888",
                  marginTop: "2px"
                }}
              >
                {routeStatusLabel}
              </div>
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
