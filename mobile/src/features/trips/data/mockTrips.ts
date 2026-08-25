import { colors } from "../../../theme/tokens";
import type { TripSectionData, TripSummary } from "../types";

export const mockUpcomingTrips: TripSummary[] = [
  {
    id: "trip_kyoto",
    title: "Kyoto Autumn Retreat",
    destination: "Kyoto, Japan",
    startDate: "2026-10-14",
    endDate: "2026-10-22",
    dateLabel: "Oct 14 - Oct 22",
    status: "upcoming",
    statusBadgeText: "In 12 Days",
    statusBadgeVariant: "primary",
    travelers: [
      {
        id: "u1",
        name: "John Smith",
        initials: "JS",
        colorVariant: "secondary",
      },
      { id: "u2", name: "Maya King", initials: "MK", colorVariant: "tertiary" },
    ],
    actionLabel: "View Itinerary",
  },
  {
    id: "trip_nordic",
    title: "Nordic Lights Tour",
    destination: "Tromsø, Norway",
    startDate: "2026-12-05",
    endDate: "2026-12-15",
    dateLabel: "Dec 05 - Dec 15",
    status: "upcoming",
    statusBadgeText: "Planning",
    statusBadgeVariant: "surface",
    travelers: [
      {
        id: "u1",
        name: "John Smith",
        initials: "JS",
        colorVariant: "secondary",
      },
    ],
    actionLabel: "Continue Planning",
  },
];

export const mockPastTrips: TripSummary[] = [
  {
    id: "trip_swiss",
    title: "Swiss Alps Hiking",
    destination: "Interlaken, Switzerland",
    startDate: "2025-08-10",
    endDate: "2025-08-18",
    dateLabel: "Aug 2023",
    status: "past",
    actionLabel: "Review Photos",
  },
  {
    id: "trip_rome",
    title: "Rome Weekend",
    destination: "Rome, Italy",
    startDate: "2025-05-12",
    endDate: "2025-05-16",
    dateLabel: "May 2023",
    status: "past",
    actionLabel: "Review Photos",
  },
  {
    id: "trip_nyc",
    title: "NYC Business",
    destination: "New York, USA",
    startDate: "2025-01-20",
    endDate: "2025-01-25",
    dateLabel: "Jan 2023",
    status: "past",
    actionLabel: "View Details",
  },
];

export function getMockTripSections(): TripSectionData[] {
  return [
    {
      type: "upcoming",
      title: "Upcoming",
      iconName: "flight-takeoff",
      iconColor: colors.brand.primary,
      data: mockUpcomingTrips,
    },
    {
      type: "past",
      title: "Past Trips",
      iconName: "history",
      iconColor: colors.text.secondary,
      data: mockPastTrips,
    },
  ];
}

export function generateLargeMockTrips(count = 20): TripSectionData[] {
  const cities = [
    { city: "Tokyo, Japan", title: "Tokyo Exploration" },
    { city: "Paris, France", title: "Paris Art & Culture" },
    { city: "Bangkok, Thailand", title: "Bangkok Street Food" },
    { city: "Seoul, South Korea", title: "Seoul City Highlights" },
    { city: "Sydney, Australia", title: "Sydney Coastal Walk" },
    { city: "Barcelona, Spain", title: "Barcelona Architecture" },
  ];

  const upcomingData: TripSummary[] = [];
  const pastData: TripSummary[] = [];

  for (let i = 1; i <= count; i++) {
    const item = cities[(i - 1) % cities.length];
    const isUpcoming = i <= Math.floor(count / 2);

    const trip: TripSummary = {
      id: `trip_stress_${i}`,
      title: `${item.title} #${i}`,
      destination: item.city,
      startDate: isUpcoming ? "2026-11-01" : "2024-03-01",
      endDate: isUpcoming ? "2026-11-08" : "2024-03-08",
      dateLabel: isUpcoming
        ? `Nov ${i} - Nov ${i + 7}, 2026`
        : `Mar 2024 (Trip #${i})`,
      status: isUpcoming ? "upcoming" : "past",
      statusBadgeText: isUpcoming
        ? i % 2 === 0
          ? "Confirmed"
          : "Planning"
        : undefined,
      statusBadgeVariant: isUpcoming
        ? i % 2 === 0
          ? "primary"
          : "surface"
        : undefined,
      travelers: isUpcoming
        ? [
            {
              id: `u_${i}`,
              name: "Alex Morgan",
              initials: "AM",
              colorVariant: "secondary",
            },
          ]
        : undefined,
      actionLabel: isUpcoming ? "View Itinerary" : "Review Photos",
    };

    if (isUpcoming) {
      upcomingData.push(trip);
    } else {
      pastData.push(trip);
    }
  }

  return [
    {
      type: "upcoming",
      title: "Upcoming",
      iconName: "flight-takeoff",
      iconColor: colors.brand.primary,
      data: upcomingData,
    },
    {
      type: "past",
      title: "Past Trips",
      iconName: "history",
      iconColor: colors.text.secondary,
      data: pastData,
    },
  ];
}
