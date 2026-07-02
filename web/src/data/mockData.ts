export interface TravelStyle {
  id: string;
  label: string;
}

export interface Transportation {
  id: string;
  label: string;
  icon: string;
}

export interface FoodPreference {
  id: string;
  label: string;
}

export interface ItineraryItem {
  day: number;
  title: string;
  spots: string[];
}

export interface TripDetail {
  id: string;
  destination: string;
  title: string;
  subtitle: string;
  weatherTemp: string;
  weatherStatus: string;
  distance: string;
  estCost: string;
  optimizationScore: number;
  tags: string[];
  itinerary: ItineraryItem[];
}

export const TRAVEL_STYLES: TravelStyle[] = [
  { id: 'relaxing', label: 'Relaxing' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'food-tour', label: 'Food Tour' },
  { id: 'culture', label: 'Culture' },
  { id: 'check-in', label: 'Check-in' },
  { id: 'nature', label: 'Nature' },
  { id: 'nightlife', label: 'Nightlife' }
];

export const TRANSPORT_OPTIONS: Transportation[] = [
  { id: 'walking', label: 'Walking', icon: 'directions_walk' },
  { id: 'motorbike', label: 'Motorbike', icon: 'two_wheeler' },
  { id: 'car', label: 'Car', icon: 'directions_car' },
  { id: 'public', label: 'Public', icon: 'directions_bus' }
];

export const FOOD_PREFERENCES: FoodPreference[] = [
  { id: 'seafood', label: 'Seafood' },
  { id: 'local-food', label: 'Local food' },
  { id: 'cafe', label: 'Cafe' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'street-food', label: 'Street food' }
];

export const SAMPLE_TRIP: TripDetail = {
  id: 'nha-trang-123',
  destination: 'Nha Trang, Vietnam',
  title: 'Nha Trang Trip',
  subtitle: '3 Days 2 Nights',
  weatherTemp: '29°C',
  weatherStatus: 'Sunny',
  distance: '25 km',
  estCost: '$220',
  optimizationScore: 92,
  tags: ['Phù hợp thời tiết', 'Tiết kiệm chi phí', 'Hải sản & Check-in'],
  itinerary: [
    {
      day: 1,
      title: 'Day 1: Cultural Intro',
      spots: ['Ponagar Tower', 'Dam Market', 'Local Seafood Dinner']
    },
    {
      day: 2,
      title: 'Day 2: Island Hopping',
      spots: ['Hon Mun Snorkeling', 'Hon Tre', 'Sunset Cafe']
    },
    {
      day: 3,
      title: 'Day 3: Nature & Relax',
      spots: ['Ba Ho Waterfalls', 'Mud Bath', 'Departure']
    }
  ]
};
