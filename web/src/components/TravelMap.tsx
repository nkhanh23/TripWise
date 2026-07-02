import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface TravelMapProps {
  center?: [number, number];
  zoom?: number;
  routeCoordinates?: [number, number][];
  markers?: { position: [number, number]; label: string; distance?: string }[];
}

export const TravelMap: React.FC<TravelMapProps> = ({
  center = [12.258, 109.194], // Nha Trang center
  zoom = 13,
  routeCoordinates = [
    [12.2706, 109.1947], // Ponagar Tower
    [12.2530, 109.1915], // Dam Market
    [12.2415, 109.1960]  // Coastal Seafood Restaurant area
  ],
  markers = [
    { position: [12.2706, 109.1947], label: 'Tháp Bà Ponagar', distance: '320m' },
    { position: [12.2530, 109.1915], label: 'Chợ Đầm', distance: '1.2km' },
    { position: [12.2415, 109.1960], label: 'Nhà Hàng Hải Sản', distance: '3.4km' }
  ]
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView(center, zoom);
    mapRef.current = map;

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Draw route line
    if (routeCoordinates && routeCoordinates.length > 0) {
      // Draw background route line (black border effect)
      L.polyline(routeCoordinates, {
        color: '#111827',
        weight: 6,
        opacity: 0.9
      }).addTo(map);

      // Draw foreground route line (blue active path)
      L.polyline(routeCoordinates, {
        color: '#2F7BFF',
        weight: 4,
        opacity: 1
      }).addTo(map);
    }

    // Add Markers
    markers.forEach(marker => {
      // Custom HTML Marker matching the bubble design
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="flex flex-col items-center">
            <div class="bg-white border border-outline-variant rounded-lg px-2 py-1 shadow-md flex items-center gap-1 min-w-[70px] justify-center scale-95 hover:scale-100 transition-transform">
              <span class="material-symbols-outlined text-primary text-[14px]">location_on</span>
              <div class="flex flex-col items-start">
                <span class="text-[9px] font-bold text-on-surface leading-none">${marker.label}</span>
                ${marker.distance ? `<span class="text-[8px] text-primary font-bold leading-none mt-0.5">${marker.distance}</span>` : ''}
              </div>
            </div>
            <div class="w-1.5 h-1.5 bg-primary rounded-full mt-0.5 border border-white"></div>
          </div>
        `,
        iconSize: [80, 42],
        iconAnchor: [40, 42]
      });

      L.marker(marker.position, { icon }).addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, routeCoordinates, markers]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Custom Floating Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <button 
          onClick={() => mapRef.current?.zoomIn()}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
        <button 
          onClick={() => mapRef.current?.zoomOut()}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
      </div>
    </div>
  );
};
