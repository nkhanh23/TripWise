import React from 'react';
import { MapMarker } from './MapMarker';
import { MapSearchBar } from './MapSearchBar';

interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  label: string;
  selected?: boolean;
  type?: 'place' | 'accommodation' | 'origin';
}

interface MapPanelProps {
  markers?: MapMarkerData[];
  showRoute?: boolean;
  className?: string;
  overlayContent?: React.ReactNode;
  searchBar?: boolean;
  height?: string;
}

// Normalize lat/lng to [minPct, maxPct] range within the panel
function normalizeLat(lat: number, minLat: number, maxLat: number, minPct = 10, maxPct = 85): number {
  if (maxLat === minLat) return 50;
  // Latitude: higher lat = higher on map (lower % from top)
  return maxPct - ((lat - minLat) / (maxLat - minLat)) * (maxPct - minPct);
}
function normalizeLng(lng: number, minLng: number, maxLng: number, minPct = 10, maxPct = 90): number {
  if (maxLng === minLng) return 50;
  return minPct + ((lng - minLng) / (maxLng - minLng)) * (maxPct - minPct);
}

export const MapPanel: React.FC<MapPanelProps> = ({
  markers = [],
  showRoute = false,
  className,
  overlayContent,
  searchBar = false,
  height = '400px',
}) => {
  const hasMarkers = markers.length > 0;

  const lats = hasMarkers ? markers.map((m) => m.lat) : [0];
  const lngs = hasMarkers ? markers.map((m) => m.lng) : [0];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const markerPositions = markers.map((m) => ({
    ...m,
    top: normalizeLat(m.lat, minLat, maxLat),
    left: normalizeLng(m.lng, minLng, maxLng),
  }));

  // Build SVG polyline points (% coords, convert to actual pixel-like coords via svg viewBox)
  const svgPoints = markerPositions
    .map((m) => `${m.left},${m.top}`)
    .join(' ');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Be+Vietnam+Pro:wght@400;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
        }
      `}</style>

      <div
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height,
          border: '3px solid #111111',
          boxShadow: '6px 6px 0 #111111',
          borderRadius: 24,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #F3C99B 0%, #F7E7C6 60%, #FFE8A3 100%)',
        }}
      >
        {/* SVG decorative grid + terrain */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#D4A96A"
                strokeWidth="0.7"
                opacity="0.45"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />

          {/* Decorative terrain blobs */}
          <ellipse cx="15%" cy="30%" rx="6%" ry="4%" fill="#C8A870" opacity="0.18" />
          <ellipse cx="65%" cy="20%" rx="8%" ry="5%" fill="#B89A60" opacity="0.15" />
          <ellipse cx="80%" cy="65%" rx="5%" ry="3%" fill="#C8A870" opacity="0.18" />
          <ellipse cx="35%" cy="70%" rx="7%" ry="4%" fill="#B89A60" opacity="0.13" />
          <ellipse cx="50%" cy="45%" rx="4%" ry="2.5%" fill="#C8A870" opacity="0.12" />

          {/* Route polyline */}
          {showRoute && markers.length > 1 && (
            <>
              {/* Black halo */}
              <polyline
                points={svgPoints}
                fill="none"
                stroke="#111111"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{ transform: 'scale(1)', transformOrigin: '0 0' }}
              />
              {/* Blue route line */}
              <polyline
                points={svgPoints}
                fill="none"
                stroke="#20A7D8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>

        {/* Placeholder text */}
        {!hasMarkers && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontFamily: "'Luckiest Guy', cursive",
                fontSize: 22,
                color: '#C4A46A',
                opacity: 0.5,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Placeholder Map
            </span>
          </div>
        )}

        {/* Markers */}
        {markerPositions.map((m, i) => (
          <MapMarker
            key={m.id}
            number={i + 1}
            label={m.label}
            type={m.type ?? 'place'}
            selected={m.selected}
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
            }}
          />
        ))}

        {/* Search bar overlay */}
        {searchBar && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
            <MapSearchBar />
          </div>
        )}

        {/* Compass rose */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="26" fill="#FFFDF3" stroke="#111111" strokeWidth="2" />
            {/* N arrow */}
            <polygon points="28,6 24,22 28,18 32,22" fill="#E6392E" stroke="#111111" strokeWidth="1" />
            {/* S arrow */}
            <polygon points="28,50 24,34 28,38 32,34" fill="#FFF6DE" stroke="#111111" strokeWidth="1" />
            {/* E W letters */}
            <text x="40" y="31" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="'Be Vietnam Pro', sans-serif" fill="#111111">E</text>
            <text x="16" y="31" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="'Be Vietnam Pro', sans-serif" fill="#111111">W</text>
            <text x="28" y="14" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="'Be Vietnam Pro', sans-serif" fill="#E6392E">N</text>
            <text x="28" y="50" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="'Be Vietnam Pro', sans-serif" fill="#111111">S</text>
            <circle cx="28" cy="28" r="3" fill="#111111" />
          </svg>
        </div>

        {/* Overlay content */}
        {overlayContent && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              zIndex: 10,
            }}
          >
            {overlayContent}
          </div>
        )}
      </div>
    </>
  );
};

export default MapPanel;
