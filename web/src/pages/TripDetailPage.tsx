import React, { useState } from 'react';
import { SAMPLE_TRIP } from '../data/mockData';
import { ItineraryTimeline } from '../components/ItineraryTimeline';
import { TravelMap } from '../components/TravelMap';

export interface TripDetailPageProps {}

export const TripDetailPage: React.FC<TripDetailPageProps> = () => {
  const [activeDay, setActiveDay] = useState(1);

  interface MarkerInfo {
    position: [number, number];
    label: string;
    distance?: string;
  }

  // Map markers depending on the selected day
  const getMarkersForDay = (day: number): MarkerInfo[] => {
    switch (day) {
      case 1:
        return [
          { position: [12.2706, 109.1947], label: 'Tháp Bà Ponagar', distance: '320m' },
          { position: [12.2530, 109.1915], label: 'Chợ Đầm', distance: '1.2km' },
          { position: [12.2415, 109.1960], label: 'Hải Sản Gió Biển', distance: '3.4km' }
        ];
      case 2:
        return [
          { position: [12.1812, 109.2155], label: 'Lặn Biển Hòn Mun', distance: 'Start' },
          { position: [12.2215, 109.2435], label: 'Hòn Tre (VinWonders)', distance: '8km' },
          { position: [12.2430, 109.1980], label: 'Sunset Cafe Cầu Đá', distance: '12km' }
        ];
      case 3:
        return [
          { position: [12.3912, 109.1345], label: 'Thác Ba Hồ', distance: 'Start' },
          { position: [12.2450, 109.1850], label: 'Tắm Bùn Trăm Trứng', distance: '15km' },
          { position: [12.2220, 109.1920], label: 'Sân Bay Cam Ranh', distance: '35km' }
        ];
      default:
        return [];
    }
  };

  const getCoordinatesForDay = (day: number) => {
    switch (day) {
      case 1:
        return [
          [12.2706, 109.1947],
          [12.2530, 109.1915],
          [12.2415, 109.1960]
        ] as [number, number][];
      case 2:
        return [
          [12.1812, 109.2155],
          [12.2215, 109.2435],
          [12.2430, 109.1980]
        ] as [number, number][];
      case 3:
        return [
          [12.3912, 109.1345],
          [12.2450, 109.1850],
          [12.2220, 109.1920]
        ] as [number, number][];
      default:
        return [];
    }
  };

  const dayMarkers = getMarkersForDay(activeDay);

  const dayCoordinates = getCoordinatesForDay(activeDay);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Left Column: Itinerary Details */}
      <div className="lg:col-span-6 flex flex-col space-y-6 overflow-y-auto pr-2">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
          {/* Header */}
          <div className="mb-4">
            <h2 className="font-bold text-display-lg text-on-background">{SAMPLE_TRIP.title}</h2>
            <p className="font-semibold text-body-md text-on-surface-variant">{SAMPLE_TRIP.subtitle}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {SAMPLE_TRIP.tags.map((tag, idx) => (
              <span 
                key={idx} 
                className="bg-tripwise-lime/30 text-on-surface-variant border border-tripwise-lime/60 px-3 py-1 rounded-full font-semibold text-label-md shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface p-3 rounded-xl border border-outline-variant flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-primary mb-1">route</span>
              <span className="font-semibold text-[10px] text-on-surface-variant">Distance</span>
              <span className="font-bold text-on-background">{SAMPLE_TRIP.distance}</span>
            </div>
            <div className="bg-surface p-3 rounded-xl border border-outline-variant flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-primary-fixed-dim mb-1">two_wheeler</span>
              <span className="font-semibold text-[10px] text-on-surface-variant">Transport</span>
              <span className="font-bold text-on-background">Motorbike</span>
            </div>
            <div className="bg-surface p-3 rounded-xl border border-outline-variant flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-tertiary-fixed-dim mb-1">light_mode</span>
              <span className="font-semibold text-[10px] text-on-surface-variant">Weather</span>
              <span className="font-bold text-on-background">{SAMPLE_TRIP.weatherTemp} ({SAMPLE_TRIP.weatherStatus})</span>
            </div>
          </div>

          {/* Interactive Timeline */}
          <div className="mb-6">
            <h3 className="font-bold text-label-md text-on-surface-variant mb-4 uppercase tracking-wider">Itinerary Schedule</h3>
            <ItineraryTimeline 
              itinerary={SAMPLE_TRIP.itinerary}
              activeDay={activeDay}
              onDayClick={(day) => setActiveDay(day)}
            />
          </div>

          {/* AI Optimization Footer Card */}
          <div className="bg-on-background text-on-primary rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tripwise-lime/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-tripwise-lime">psychology</span>
              </div>
              <div>
                <div className="font-semibold text-label-sm text-outline-variant mb-0.5">AI Optimization Score</div>
                <div className="font-bold text-[18px] text-tripwise-lime">{SAMPLE_TRIP.optimizationScore}% Highly Optimized</div>
              </div>
            </div>
            <button className="px-3 py-1.5 border border-outline-variant/30 rounded-lg font-semibold text-label-sm hover:bg-surface-container-highest/20 transition-colors">
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Leaflet Map */}
      <div className="lg:col-span-6 flex flex-col h-full relative">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full h-full overflow-hidden relative shadow-sm">
          {/* Map Top Floating Navigation */}
          <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between gap-4 pointer-events-none">
            <div className="relative pointer-events-auto flex-1 max-w-[300px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-xl shadow-md font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <div className="pointer-events-auto bg-white border border-outline-variant rounded-xl shadow-md px-4 py-2.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-fixed-dim border border-primary"></span>
              <span className="font-bold text-[11px] leading-none text-on-background">03 Stops Selected</span>
            </div>
          </div>

          <TravelMap 
            center={dayCoordinates[0] || [12.258, 109.194]}
            markers={dayMarkers}
            routeCoordinates={dayCoordinates}
          />

          {/* Map Bottom Floating Guideline Card */}
          <div className="absolute bottom-4 left-4 right-16 z-[1000] pointer-events-none flex justify-center">
            <div className="pointer-events-auto bg-white border border-outline-variant rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 max-w-[90%] scale-95 hover:scale-100 transition-transform">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">turn_right</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-label-md text-on-background leading-none">Directions Guide</span>
                <span className="text-[11px] text-on-surface-variant mt-0.5">Turn right in 30m to reach Tháp Bà Ponagar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
