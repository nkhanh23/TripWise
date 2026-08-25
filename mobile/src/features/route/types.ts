import type MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type TransportMode = "transit" | "walking" | "driving" | "cycling";

export type TransportOption = {
  mode: TransportMode;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
};

export type RouteStep = {
  id: string;
  instruction: string;
  distanceLabel: string;
  durationLabel?: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  time?: string;
  subDetail?: string;
};

export type MockRouteData = {
  id: string;
  transportMode: TransportMode;
  durationMinutes: number;
  durationLabel: string;
  distanceKm: number;
  distanceLabel: string;
  estimatedCost?: string;
  routeSummary: string;
  trafficLabel?: string;
  steps: RouteStep[];
  geometry: {
    origin: { topPercent: number; leftPercent: number; name: string };
    destination: { topPercent: number; leftPercent: number; name: string };
    waypointSegments: { topPercent: number; leftPercent: number }[];
  };
};

export type RouteUIStatus = "loading" | "ready" | "error" | "unavailable";
