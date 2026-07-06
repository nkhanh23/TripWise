"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type DivIcon } from "leaflet";
import type { ExploreViewportBounds } from "./explore-map-query";
import styles from "./ExploreLeafletMap.module.css";

export type MapMarkerData = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  categorySlug?: string;
  selected?: boolean;
};

type ExploreLeafletMapProps = {
  markers: MapMarkerData[];
  onMarkerClick?: (id: string) => void;
  onViewportChange?: (bounds: ExploreViewportBounds) => void;
  center?: [number, number];
  selectedMarkerId?: string | null;
  fitBoundsKey?: string;
};

const DEFAULT_CENTER: [number, number] = [12.2415, 109.1960];

const CATEGORY_COLORS: Record<string, string> = {
  bien: "#20A7D8",
  "van-hoa": "#E8A838",
  "am-thuc": "#E05353",
  cafe: "#8B7355",
  "check-in": "#B8F24A",
  "mua-sam": "#E87BB0",
  "thien-nhien": "#5FAD56",
  khac: "#A0A0A0",
};

function getCategoryColor(categorySlug?: string): string {
  if (!categorySlug) return "#20A7D8";
  return CATEGORY_COLORS[categorySlug.toLowerCase()] ?? "#20A7D8";
}

function MapController({
  markers,
  defaultCenter,
  selectedMarkerId,
  fitBoundsKey,
}: {
  markers: MapMarkerData[];
  defaultCenter: [number, number];
  selectedMarkerId?: string | null;
  fitBoundsKey: string;
}) {
  const map = useMap();
  const hasAppliedInitialBounds = useRef(false);
  const markerPositionKey = markers
    .map((marker) => `${marker.id}:${marker.lat}:${marker.lng}`)
    .join("|");
  const previousMarkerPositionKey = useRef<string | null>(null);

  useEffect(() => {
    hasAppliedInitialBounds.current = false;
    previousMarkerPositionKey.current = null;
  }, [fitBoundsKey]);

  useEffect(() => {
    if (previousMarkerPositionKey.current === markerPositionKey) {
      return;
    }

    previousMarkerPositionKey.current = markerPositionKey;

    if (markers.length === 0) {
      if (!hasAppliedInitialBounds.current) {
        map.setView(defaultCenter, 13);
      }
      return;
    }

    if (hasAppliedInitialBounds.current) {
      return;
    }

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 15);
      hasAppliedInitialBounds.current = true;
      return;
    }

    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
    hasAppliedInitialBounds.current = true;
  }, [defaultCenter, map, markerPositionKey, markers]);

  useEffect(() => {
    if (!selectedMarkerId || !hasAppliedInitialBounds.current) {
      return;
    }

    const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId);
    if (!selectedMarker) {
      return;
    }

    map.flyTo([selectedMarker.lat, selectedMarker.lng], map.getZoom(), {
      animate: true,
      duration: 0.6,
    });
  }, [selectedMarkerId, markers, map]);

  return null;
}

function ViewportListener({
  onViewportChange,
}: {
  onViewportChange?: (bounds: ExploreViewportBounds) => void;
}) {
  const map = useMap();
  const emitViewportBounds = useMemo(() => () => {
    if (!onViewportChange) {
      return;
    }

    const bounds = map.getBounds();
    onViewportChange({
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
    });
  }, [map, onViewportChange]);

  useMapEvents({
    moveend: emitViewportBounds,
    zoomend: emitViewportBounds,
  });

  useEffect(() => {
    emitViewportBounds();
  }, [emitViewportBounds]);

  return null;
}

export function ExploreLeafletMap({
  markers,
  onMarkerClick,
  onViewportChange,
  center = DEFAULT_CENTER,
  selectedMarkerId = null,
  fitBoundsKey = "default",
}: ExploreLeafletMapProps) {

  const createMarkerIcon = useMemo(() => {
    return (marker: MapMarkerData): DivIcon => {
      const color = getCategoryColor(marker.categorySlug);
      return L.divIcon({
        className: "",
        html: `
          <div class="${styles.markerOuter} ${marker.selected ? styles.markerOuterSelected : ""}">
            <div class="${styles.markerCore}" style="background: ${marker.selected ? "#B8F24A" : color};">
              <span class="${styles.markerLetter}">${marker.label.charAt(0)}</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
    };
  }, []);

  return (
    <div className={styles.mapCanvas}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController
          markers={markers}
          defaultCenter={center}
          selectedMarkerId={selectedMarkerId}
          fitBoundsKey={fitBoundsKey}
        />
        <ViewportListener onViewportChange={onViewportChange} />

        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={createMarkerIcon(m)}
            eventHandlers={{
              click: () => {
                onMarkerClick?.(m.id);
              }
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
export default ExploreLeafletMap;
