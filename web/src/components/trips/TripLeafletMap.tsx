"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import L, { type DivIcon, type LatLngExpression } from "leaflet";
import styles from "./TripLeafletMap.module.css";
import type { ItineraryDayResponse } from "@/lib/api";

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
  selected: boolean;
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
            selected:
              day.dayNumber === activeDay && item.orderIndex === selectedOrderIndex
          }))
      )
      .filter((stop) => (activeDay ? stop.dayNumber === activeDay : true));
  }, [activeDay, days, selectedOrderIndex]);

  const selectedStop = stops.find((stop) => stop.selected);

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
                <span>
                  Day {stop.dayNumber} • {stop.timeLabel}
                </span>
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
      </div>

      {stops.length === 0 ? (
        <div className={styles.emptyOverlay}>
          Khong co toa do hop le de ve marker cho ngay nay.
        </div>
      ) : null}
    </div>
  );
}
