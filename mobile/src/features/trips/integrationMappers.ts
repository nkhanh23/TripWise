import type {
  SavedTripDetail,
  SavedTripSummary,
} from "../../integration/contracts";

import type { TripDetailData, TripSectionData, TripSummary } from "./types";

function dateLabel(startDate: string, endDate: string): string {
  return `${startDate} - ${endDate}`;
}

export function mapSavedTripSummaryToTripSummary(
  summary: SavedTripSummary,
): TripSummary {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: summary.id,
    title: summary.title,
    destination: summary.destination,
    startDate: summary.startDate,
    endDate: summary.endDate,
    dateLabel: dateLabel(summary.startDate, summary.endDate),
    status: summary.startDate >= now ? "upcoming" : "past",
    actionLabel: "View Itinerary",
    coverGooglePlaceIds: summary.coverGooglePlaceIds,
  };
}

export function mapSavedTripPageToSections(
  items: SavedTripSummary[],
): TripSectionData[] {
  const mapped = items.map(mapSavedTripSummaryToTripSummary);
  return [
    {
      type: "upcoming",
      title: "Upcoming",
      iconName: "flight-takeoff",
      iconColor: "",
      data: mapped.filter((item) => item.status === "upcoming"),
    },
    {
      type: "past",
      title: "Past Trips",
      iconName: "history",
      iconColor: "",
      data: mapped.filter((item) => item.status === "past"),
    },
  ];
}

export function mapSavedTripDetailToTripDetailData(
  detail: SavedTripDetail,
): TripDetailData {
  return {
    id: detail.id,
    title: detail.title,
    destination: detail.destination,
    startDate: detail.startDate,
    endDate: detail.endDate,
    dateLabel: dateLabel(detail.startDate, detail.endDate),
    durationDays: detail.days.length,
    heroImageUrl: "",
    budgetSpent: "",
    budgetTotal: "",
    budgetPercent: 0,
    travelers: [],
    savedPlacesCount: detail.days.reduce(
      (count, day) => count + day.items.length,
      0,
    ),
    days: detail.days.map((day, dayIndex) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date ?? detail.startDate,
      dateLabel: `Day ${day.dayNumber} • ${day.date ?? detail.startDate}`,
      title: day.summary,
      items: day.items.map((item, itemIndex) => ({
        id: item.id,
        type: "place" as const,
        time: item.startTime ?? "",
        title: item.placeName,
        subtitle: item.note,
        description: item.note,
        iconName: "location-on" as const,
        placeId: undefined,
        location:
          item.resolution === "UNRESOLVED"
            ? "Unresolved place suggestion"
            : item.placeAddress,
        resolution: item.resolution,
        ...(item.resolution === "VERIFIED"
          ? {
              googlePlaceId: item.googlePlaceId,
              latitude: item.latitude,
              longitude: item.longitude,
              placeResolvedAt: item.placeResolvedAt,
            }
          : {}),
      })),
    })),
  };
}
