import type {
  MockRouteData,
  RouteStep,
  TransportMode,
  TransportOption,
} from "../types";

export const transportOptions: TransportOption[] = [
  { mode: "transit", label: "Transit", iconName: "directions-bus" },
  { mode: "walking", label: "Walk", iconName: "directions-walk" },
  { mode: "driving", label: "Drive", iconName: "directions-car" },
  { mode: "cycling", label: "Bicycle", iconName: "directions-bike" },
];

export const mockTransitRoute: MockRouteData = {
  id: "route_transit_default",
  transportMode: "transit",
  durationMinutes: 17,
  durationLabel: "17 min",
  distanceKm: 4.2,
  distanceLabel: "4.2 km",
  estimatedCost: "฿45",
  routeSummary: "Fastest route via BTS Sukhumvit Line",
  trafficLabel: "Arrive by 14:45 • Very low crowding",
  geometry: {
    origin: { topPercent: 65, leftPercent: 35, name: "Current Location" },
    destination: { topPercent: 25, leftPercent: 68, name: "Destination" },
    waypointSegments: [
      { topPercent: 65, leftPercent: 35 },
      { topPercent: 55, leftPercent: 42 },
      { topPercent: 42, leftPercent: 54 },
      { topPercent: 30, leftPercent: 62 },
      { topPercent: 25, leftPercent: 68 },
    ],
  },
  steps: [
    {
      id: "step_1",
      instruction: "Walk to BTS Asok",
      distanceLabel: "250m",
      durationLabel: "3 min",
      iconName: "directions-walk",
      time: "14:28",
      subDetail: "Head north on Soi Sukhumvit 19 toward main road",
    },
    {
      id: "step_2",
      instruction: "BTS Sukhumvit Line (Towards Khu Khot)",
      distanceLabel: "3.4 km",
      durationLabel: "9 min",
      iconName: "train",
      time: "14:31",
      subDetail: "Ride 4 stops • Asok (E4) to Siam (CEN)",
    },
    {
      id: "step_3",
      instruction: "Transfer at Siam Station",
      distanceLabel: "80m",
      durationLabel: "2 min",
      iconName: "transfer-within-a-station",
      time: "14:40",
      subDetail: "Exit through Gate 3 toward connecting skybridge",
    },
    {
      id: "step_4",
      instruction: "Walk to Destination",
      distanceLabel: "350m",
      durationLabel: "5 min",
      iconName: "location-on",
      time: "14:45",
      subDetail: "Arrive at destination entrance",
    },
  ],
};

export const mockWalkingRoute: MockRouteData = {
  id: "route_walking_default",
  transportMode: "walking",
  durationMinutes: 52,
  durationLabel: "52 min",
  distanceKm: 4.0,
  distanceLabel: "4.0 km",
  routeSummary: "Scenic pedestrian walkway via Phloen Chit & Rama I",
  trafficLabel: "Safe sidewalks • Elevated skywalk available",
  geometry: {
    origin: { topPercent: 65, leftPercent: 35, name: "Current Location" },
    destination: { topPercent: 25, leftPercent: 68, name: "Destination" },
    waypointSegments: [
      { topPercent: 65, leftPercent: 35 },
      { topPercent: 50, leftPercent: 45 },
      { topPercent: 35, leftPercent: 58 },
      { topPercent: 25, leftPercent: 68 },
    ],
  },
  steps: [
    {
      id: "walk_1",
      instruction: "Head west on Sukhumvit Road",
      distanceLabel: "1.2 km",
      durationLabel: "15 min",
      iconName: "directions-walk",
      time: "14:28",
      subDetail: "Follow the shaded pedestrian sidewalk under the BTS line",
    },
    {
      id: "walk_2",
      instruction: "Ascend onto the R-Walk Skywalk",
      distanceLabel: "1.8 km",
      durationLabel: "22 min",
      iconName: "directions-walk",
      time: "14:43",
      subDetail: "Elevated walkway with barrier protection and escalators",
    },
    {
      id: "walk_3",
      instruction: "Arrive at Destination entrance",
      distanceLabel: "1.0 km",
      durationLabel: "15 min",
      iconName: "location-on",
      time: "15:20",
      subDetail: "Enter through the main front plaza",
    },
  ],
};

export const mockDrivingRoute: MockRouteData = {
  id: "route_driving_default",
  transportMode: "driving",
  durationMinutes: 14,
  durationLabel: "14 min",
  distanceKm: 4.8,
  distanceLabel: "4.8 km",
  estimatedCost: "฿90-120 (Taxi)",
  routeSummary: "Via Phloen Chit Rd (Moderate traffic)",
  trafficLabel: "Typical traffic for this time of day",
  geometry: {
    origin: { topPercent: 65, leftPercent: 35, name: "Current Location" },
    destination: { topPercent: 25, leftPercent: 68, name: "Destination" },
    waypointSegments: [
      { topPercent: 65, leftPercent: 35 },
      { topPercent: 60, leftPercent: 50 },
      { topPercent: 40, leftPercent: 55 },
      { topPercent: 25, leftPercent: 68 },
    ],
  },
  steps: [
    {
      id: "drive_1",
      instruction: "Head west on Sukhumvit Rd toward Soi 17",
      distanceLabel: "1.5 km",
      durationLabel: "4 min",
      iconName: "directions-car",
      time: "14:28",
      subDetail: "Stay in middle lanes",
    },
    {
      id: "drive_2",
      instruction: "Continue onto Phloen Chit Rd / Rama I Rd",
      distanceLabel: "2.5 km",
      durationLabel: "7 min",
      iconName: "directions-car",
      time: "14:32",
      subDetail: "Pass Central Embassy on the left",
    },
    {
      id: "drive_3",
      instruction: "Turn left into the drop-off driveway",
      distanceLabel: "800m",
      durationLabel: "3 min",
      iconName: "location-on",
      time: "14:42",
      subDetail: "Destination will be on the right",
    },
  ],
};

export const mockCyclingRoute: MockRouteData = {
  id: "route_cycling_default",
  transportMode: "cycling",
  durationMinutes: 22,
  durationLabel: "22 min",
  distanceKm: 4.3,
  distanceLabel: "4.3 km",
  routeSummary: "Via Benjakitti Green Link & quiet alleys",
  trafficLabel: "Low traffic • Mostly flat terrain",
  geometry: {
    origin: { topPercent: 65, leftPercent: 35, name: "Current Location" },
    destination: { topPercent: 25, leftPercent: 68, name: "Destination" },
    waypointSegments: [
      { topPercent: 65, leftPercent: 35 },
      { topPercent: 52, leftPercent: 48 },
      { topPercent: 38, leftPercent: 52 },
      { topPercent: 25, leftPercent: 68 },
    ],
  },
  steps: [
    {
      id: "bike_1",
      instruction: "Head south into Benjakitti Forest Park",
      distanceLabel: "1.5 km",
      durationLabel: "7 min",
      iconName: "directions-bike",
      time: "14:28",
      subDetail: "Dedicated paved cycle path",
    },
    {
      id: "bike_2",
      instruction: "Take the Green Mile elevated bridge to Lumphini",
      distanceLabel: "1.8 km",
      durationLabel: "9 min",
      iconName: "directions-bike",
      time: "14:35",
      subDetail: "Pedestrian & bicycle overpass with scenic city views",
    },
    {
      id: "bike_3",
      instruction: "Arrive at destination bicycle parking rack",
      distanceLabel: "1.0 km",
      durationLabel: "6 min",
      iconName: "location-on",
      time: "14:50",
      subDetail: "Secure bike racks available near Gate 1",
    },
  ],
};

export const mockRoutesByMode: Record<TransportMode, MockRouteData> = {
  transit: mockTransitRoute,
  walking: mockWalkingRoute,
  driving: mockDrivingRoute,
  cycling: mockCyclingRoute,
};

export function generateLongMockRouteSteps(count = 50): RouteStep[] {
  const iconNames: (keyof typeof import("@expo/vector-icons/MaterialIcons").default.glyphMap)[] =
    [
      "directions-walk",
      "turn-right",
      "turn-left",
      "straight",
      "train",
      "directions-bike",
      "location-on",
    ];
  const streetNames = [
    "Sukhumvit Rd",
    "Rama I Rd",
    "Phloen Chit Rd",
    "Witshayu Rd",
    "Silom Rd",
    "Sathorn Rd",
    "Phra Ram 4 Rd",
    "Ratchadamri Rd",
  ];

  const steps: RouteStep[] = [];

  for (let i = 1; i <= count; i++) {
    const iconName = iconNames[i % iconNames.length];
    const street = streetNames[i % streetNames.length];
    const dist = ((i * 120 + 80) % 800) + 50;

    steps.push({
      id: `stress_step_${i}`,
      instruction:
        i === count
          ? "Arrive at Destination"
          : `Turn ${i % 2 === 0 ? "right" : "left"} onto ${street} (Step #${i})`,
      distanceLabel: `${dist}m`,
      durationLabel: `${Math.max(1, Math.round(dist / 80))} min`,
      iconName: i === count ? "location-on" : iconName,
      time: `14:${String(20 + Math.floor(i / 2)).padStart(2, "0")}`,
      subDetail: `Continue along ${street} for ${dist} meters before next checkpoint.`,
    });
  }

  return steps;
}

export function getMockRoute(
  _destinationId: string,
  mode: TransportMode,
): MockRouteData | null {
  if (mockRoutesByMode[mode]) {
    return mockRoutesByMode[mode];
  }
  return null;
}
