import type { HomeData } from "../types";

export const mockHomePopulatedData: HomeData = {
  greeting: "Hello, traveler",
  subtitle: "Where are we heading next?",
  upcomingTrip: {
    id: "trip_kyoto",
    title: "Kyoto Autumn Retreat",
    dateLabel: "Oct 14 – Oct 22",
    badgeText: "In 12 Days",
    destination: "Kyoto, Japan",
    imageUrl:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80",
  },
  draftTrip: {
    id: "draft_bangkok",
    title: "Bangkok Adventure",
    step: 3,
    totalSteps: 5,
    statusLabel: "Drafting",
  },
  savedPlaces: [
    {
      id: "saved_cafe_anthracite",
      name: "Cafe Anthracite",
      location: "Seoul, South Korea",
      imageUrl:
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "saved_positano_cliffs",
      name: "Positano Cliffs",
      location: "Amalfi Coast, Italy",
      imageUrl:
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80",
    },
  ],
  inspiration: {
    title: "Nearby Inspiration",
    locationName: "Discover Tokyo",
    imageUrl:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80",
    actionLabel: "Explore Map",
  },
};

export const mockHomeEmptyData: HomeData = {
  greeting: "Good morning, Traveler",
  subtitle: "Ready for your next journey?",
  upcomingTrip: null,
  draftTrip: null,
  savedPlaces: [],
  inspiration: {
    title: "Discover Tokyo",
    locationName: "Tokyo, Japan",
    imageUrl:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80",
    actionLabel: "Explore Map",
  },
};
