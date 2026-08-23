import type {
  ItineraryItem,
  MockMapCoordinate,
  TripDayItinerary,
  TripMapMarkerItem,
} from '../types';

export const DEFAULT_MOCK_MAP_ANCHORS: MockMapCoordinate[] = [
  { topPercent: 26, leftPercent: 24 },
  { topPercent: 34, leftPercent: 68 },
  { topPercent: 54, leftPercent: 32 },
  { topPercent: 66, leftPercent: 74 },
  { topPercent: 44, leftPercent: 50 },
  { topPercent: 76, leftPercent: 36 },
  { topPercent: 22, leftPercent: 58 },
  { topPercent: 48, leftPercent: 18 },
  { topPercent: 62, leftPercent: 54 },
  { topPercent: 30, leftPercent: 42 },
];

export function getItemMapCoordinate(
  _item: ItineraryItem,
  index: number
): MockMapCoordinate {
  return DEFAULT_MOCK_MAP_ANCHORS[index % DEFAULT_MOCK_MAP_ANCHORS.length];
}

export type PolylineSegment = {
  id: string;
  leftPercent: number;
  topPercent: number;
  lengthPercent: number;
  angleDeg: number;
};

export function computePolylineSegments(
  points: MockMapCoordinate[]
): PolylineSegment[] {
  const segments: PolylineSegment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const dx = p2.leftPercent - p1.leftPercent;
    const dy = p2.topPercent - p1.topPercent;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const midX = (p1.leftPercent + p2.leftPercent) / 2;
    const midY = (p1.topPercent + p2.topPercent) / 2;

    segments.push({
      id: `polyline_segment_${i}_${i + 1}`,
      leftPercent: midX,
      topPercent: midY,
      lengthPercent: length,
      angleDeg: angle,
    });
  }

  return segments;
}

export function deriveTripMapMarkers(
  days: TripDayItinerary[],
  selectedDayId: string | 'all'
): TripMapMarkerItem[] {
  if (selectedDayId === 'all') {
    const markers: TripMapMarkerItem[] = [];
    let globalIndex = 0;

    days.forEach((day) => {
      day.items.forEach((item) => {
        markers.push({
          item,
          dayNumber: day.dayNumber,
          orderNumber: globalIndex + 1,
          coordinate: getItemMapCoordinate(item, globalIndex),
        });
        globalIndex++;
      });
    });

    return markers;
  }

  const activeDay = days.find((d) => d.id === selectedDayId);
  if (!activeDay) {
    return [];
  }

  return activeDay.items.map((item, index) => ({
    item,
    dayNumber: activeDay.dayNumber,
    orderNumber: index + 1,
    coordinate: getItemMapCoordinate(item, index),
  }));
}

export function deriveVerifiedTripMapMarkers(
  days: TripDayItinerary[],
  selectedDayId: string | 'all',
): TripMapMarkerItem[] {
  const selectedDays = selectedDayId === 'all'
    ? days
    : days.filter((day) => day.id === selectedDayId);
  const markers: TripMapMarkerItem[] = [];
  let order = 1;
  for (const day of [...selectedDays].sort((a, b) => a.dayNumber - b.dayNumber)) {
    for (const item of day.items) {
      if (item.resolution !== 'VERIFIED' || item.latitude === undefined || item.longitude === undefined) continue;
      markers.push({
        item,
        dayNumber: day.dayNumber,
        orderNumber: order,
        coordinate: { topPercent: 0, leftPercent: 0 },
        verifiedCoordinate: { latitude: item.latitude, longitude: item.longitude },
      });
      order += 1;
    }
  }
  return markers;
}
