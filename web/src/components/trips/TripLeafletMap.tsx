"use client";

import { useEffect, useMemo, useState } from "react";
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

type TripLeafletMapProps = {
  activeDay: number | null;
  selectedOrderIndex: number | null;
  selectedStopTitle?: string;
  days: ItineraryDayResponse[];
};

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

function parseGeometryPositions(geometry: string): LatLngTuple[] {
  const parsed = JSON.parse(geometry) as {
    type?: string;
    coordinates?: number[][];
  };

  if (parsed.type !== "LineString" || !Array.isArray(parsed.coordinates)) {
    return [];
  }

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
    map.fitBounds(bounds.pad(0.22), { animate: true, duration: 0.8 });
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
  activeDay,
  selectedOrderIndex,
  selectedStopTitle,
  days
}: TripLeafletMapProps) {
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "fallback">(
    "idle"
  );

  const stops = useMemo(() => {
    return days
      .flatMap((day) =>
        day.items
          .filter(
            (item) =>
              typeof item.place?.latitude === "number" &&
              typeof item.place?.longitude === "number"
          )
          .map((item) => ({
            id: `${day.dayNumber}-${item.orderIndex}`,
            dayNumber: day.dayNumber,
            orderIndex: item.orderIndex,
            title: item.place?.name || `Stop ${item.orderIndex + 1}`,
            subtitle: item.place?.city || "TripWise stop",
            latitude: item.place?.latitude as number,
            longitude: item.place?.longitude as number,
            category: item.place?.categoryName,
            timeLabel: formatTimeLabel(item),
            transportMode: item.transportSuggestion?.mode,
            selected:
              day.dayNumber === activeDay && item.orderIndex === selectedOrderIndex
          }))
      )
      .filter((stop) => (activeDay ? stop.dayNumber === activeDay : true))
      .sort((left, right) => left.orderIndex - right.orderIndex);
  }, [activeDay, days, selectedOrderIndex]);

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
    if (selectedOrderIndex === null || selectedOrderIndex <= 0) {
      return null;
    }

    const previousStop = stops.find((stop) => stop.orderIndex === selectedOrderIndex - 1);
    const currentStop = stops.find((stop) => stop.orderIndex === selectedOrderIndex);

    if (!previousStop || !currentStop) {
      return null;
    }

    return `${previousStop.id}-${currentStop.id}`;
  }, [selectedOrderIndex, stops]);

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
              color: segment.id === selectedSegmentId ? "#20a7d8" : "#111111",
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

      <div className={styles.mapHud}>
        <div className={styles.mapHudCard}>
          <span className={styles.mapHudLabel}>Map mode</span>
          <span className={styles.mapHudValue}>Leaflet + OpenStreetMap</span>
        </div>
        <div className={styles.mapHudCard}>
          <span className={styles.mapHudLabel}>Day dang xem</span>
          <span className={styles.mapHudValue}>
            {activeDay ? `Day ${activeDay}` : "Tat ca"}
          </span>
        </div>
        <div className={styles.mapHudCard}>
          <span className={styles.mapHudLabel}>Selected stop</span>
          <span className={styles.mapHudValue}>
            {selectedStopTitle || "Chon item tu timeline"}
          </span>
        </div>
        <div className={styles.mapHudCard}>
          <span className={styles.mapHudLabel}>Route path</span>
          <span className={styles.mapHudValue}>{routeStatusLabel}</span>
        </div>
      </div>

      {stops.length === 0 ? (
        <div className={styles.emptyOverlay}>
          Khong co toa do hop le de ve marker cho ngay nay.
        </div>
      ) : null}
    </div>
  );
}
