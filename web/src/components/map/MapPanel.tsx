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
  onMarkerClick?: (id: string) => void;
}

// Normalize lat/lng to [minPct, maxPct] range within the panel
// Using safe margins (25% to 75%) to keep markers inside viewport
function normalizeLat(lat: number, minLat: number, maxLat: number, minPct = 25, maxPct = 75): number {
  if (maxLat === minLat) return 50;
  // Latitude: higher lat = higher on map (lower % from top)
  return maxPct - ((lat - minLat) / (maxLat - minLat)) * (maxPct - minPct);
}
function normalizeLng(lng: number, minLng: number, maxLng: number, minPct = 25, maxPct = 75): number {
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
  onMarkerClick,
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

  // Generate smooth cubic curves path for route polyline overlay
  let routePathD = '';
  if (markerPositions.length > 0) {
    routePathD = `M ${markerPositions[0].left},${markerPositions[0].top}`;
    for (let i = 0; i < markerPositions.length - 1; i++) {
      const p0 = markerPositions[i];
      const p1 = markerPositions[i + 1];
      
      const dx = p1.left - p0.left;
      const dy = p1.top - p0.top;
      
      // Control points for nice organic bezier curve
      const cx1 = p0.left + dx * 0.4;
      const cy1 = p0.top + dy * 0.05;
      const cx2 = p0.left + dx * 0.6;
      const cy2 = p1.top - dy * 0.05;
      
      routePathD += ` C ${cx1},${cy1} ${cx2},${cy2} ${p1.left},${p1.top}`;
    }
  }

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
        {/* SVG decorative adventure map layers */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="#D4A96A"
                strokeWidth="0.15"
                opacity="0.35"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />

          {/* Coastline and Sea Bay Area (Nha Trang Bay) */}
          <path d="M 82,-10 C 80,30 75,50 78,70 C 80,85 85,95 88,110 L 110,110 L 110,-10 Z" fill="rgba(32, 167, 216, 0.12)" />
          {/* Shore wave lines */}
          <path d="M 82,-10 C 80,30 75,50 78,70 C 80,85 85,95 88,110" fill="none" stroke="rgba(32, 167, 216, 0.3)" strokeWidth="0.6" strokeDasharray="1,1" />

          {/* Decorative land areas */}
          <rect x="25" y="45" width="12" height="15" rx="3" fill="rgba(184, 242, 74, 0.12)" />
          <rect x="42" y="28" width="10" height="8" rx="2" fill="rgba(255, 209, 102, 0.15)" stroke="rgba(80, 60, 40, 0.15)" strokeWidth="0.2" />

          {/* Mock Street Road Curves lines */}
          <path d="M -10,35 C 20,40 50,30 80,45" fill="none" stroke="rgba(80, 60, 40, 0.14)" strokeWidth="0.8" />
          <path d="M 30,-10 C 35,40 45,70 50,110" fill="none" stroke="rgba(80, 60, 40, 0.14)" strokeWidth="0.8" />
          <path d="M 68,-10 C 65,30 60,60 62,110" fill="none" stroke="rgba(80, 60, 40, 0.14)" strokeWidth="1.2" />
          <path d="M 15,95 C 40,90 70,105 110,90" fill="none" stroke="rgba(80, 60, 40, 0.14)" strokeWidth="0.8" />

          {/* Label small texts */}
          <text x="89" y="40" textAnchor="middle" fontSize="2.8" fontWeight="800" fill="rgba(80, 60, 40, 0.4)" transform="rotate(90, 89, 40)" fontFamily="'Be Vietnam Pro', sans-serif">VỊNH NHA TRANG</text>
          <text x="31" y="53" textAnchor="middle" fontSize="1.8" fontWeight="800" fill="rgba(80, 60, 40, 0.4)" fontFamily="'Be Vietnam Pro', sans-serif">CÔNG VIÊN BẠCH ĐẰNG</text>
          <text x="64" y="80" textAnchor="middle" fontSize="2" fontWeight="800" fill="rgba(80, 60, 40, 0.4)" transform="rotate(-75, 64, 80)" fontFamily="'Be Vietnam Pro', sans-serif">ĐƯỜNG TRẦN PHÚ</text>
          <text x="47" y="32" textAnchor="middle" fontSize="1.6" fontWeight="800" fill="rgba(80, 60, 40, 0.4)" fontFamily="'Be Vietnam Pro', sans-serif">CHỢ ĐẦM AREA</text>

          {/* Route polyline (Smooth bezier curve overlay) */}
          {showRoute && markerPositions.length > 1 && (
            <>
              {/* Outer white halo line */}
              <path
                d={routePathD}
                fill="none"
                stroke="#FFF6DE"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Main cyan route line */}
              <path
                d={routePathD}
                fill="none"
                stroke="#20A7D8"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-route-draw"
                style={{ strokeDasharray: '100', animation: 'routeDraw 1.2s ease-in-out both' }}
              />
              {/* Inner dashed black line for adventure stamp look */}
              <path
                d={routePathD}
                fill="none"
                stroke="#111111"
                strokeWidth="0.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1.5,1.5"
              />
            </>
          )}
        </svg>

        {/* Placeholder text if no markers */}
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
            onClick={() => onMarkerClick?.(m.id)}
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
