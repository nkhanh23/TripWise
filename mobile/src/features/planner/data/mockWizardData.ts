import type {
  BudgetOption,
  CreateTripWizardState,
  DestinationOption,
  GroupOption,
  PaceOption,
  TravelStyleOption,
} from '../types';

// Intentional local planner configuration. These are curated choice labels and
// destination suggestions for the wizard, not live provider search results.
// The historical `mock*` export names remain for compatibility with existing UI.

export const mockPopularDestinations: DestinationOption[] = [
  {
    id: 'dest_bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    imageUrl:
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
    tag: 'Top Pick',
    popular: true,
  },
  {
    id: 'dest_tokyo',
    name: 'Tokyo',
    country: 'Japan',
    imageUrl:
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    tag: 'Trending',
    popular: true,
  },
  {
    id: 'dest_danang',
    name: 'Da Nang',
    country: 'Vietnam',
    imageUrl:
      'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
    tag: 'Beach & Culture',
    popular: true,
  },
  {
    id: 'dest_paris',
    name: 'Paris',
    country: 'France',
    imageUrl:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
    tag: 'Romantic',
    popular: true,
  },
  {
    id: 'dest_bali',
    name: 'Bali',
    country: 'Indonesia',
    imageUrl:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
    tag: 'Nature & Relax',
    popular: true,
  },
  {
    id: 'dest_seoul',
    name: 'Seoul',
    country: 'South Korea',
    imageUrl:
      'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=600&q=80',
    tag: 'Food & Shopping',
    popular: true,
  },
  {
    id: 'dest_london',
    name: 'London',
    country: 'United Kingdom',
    imageUrl:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
    tag: 'Historic',
    popular: true,
  },
  {
    id: 'dest_singapore',
    name: 'Singapore',
    country: 'Singapore',
    imageUrl:
      'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80',
    tag: 'City Explorer',
    popular: true,
  },
];

export const mockTravelStyles: TravelStyleOption[] = [
  {
    id: 'culture',
    label: 'Culture & History',
    iconName: 'account-balance',
    description: 'Temples, museums, monuments and historical districts',
  },
  {
    id: 'food',
    label: 'Food & Dining',
    iconName: 'restaurant',
    description: 'Street food, Michelin guide, local markets & cafes',
  },
  {
    id: 'nature',
    label: 'Nature & Outdoors',
    iconName: 'park',
    description: 'Parks, beaches, hiking trails and scenic view spots',
  },
  {
    id: 'shopping',
    label: 'Shopping & Markets',
    iconName: 'shopping-bag',
    description: 'Night markets, luxury malls and local boutique shops',
  },
  {
    id: 'relaxation',
    label: 'Relaxation & Wellness',
    iconName: 'spa',
    description: 'Spas, onsens, rooftop lounges and slow strolls',
  },
  {
    id: 'adventure',
    label: 'Adventure & Thrills',
    iconName: 'hiking',
    description: 'Water sports, day excursions and active exploration',
  },
  {
    id: 'nightlife',
    label: 'Nightlife & Events',
    iconName: 'nightlife',
    description: 'Night markets, live music venues and river cruises',
  },
  {
    id: 'art',
    label: 'Art & Architecture',
    iconName: 'palette',
    description: 'Contemporary galleries, design hubs and photography',
  },
];

export const mockPaceOptions: PaceOption[] = [
  {
    id: 'relaxed',
    label: 'Relaxed',
    description: 'Take it easy with generous downtime between key highlights.',
    iconName: 'coffee',
    dailyPlacesLabel: '2-3 places / day',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: 'Balanced mix of top sights, meals, and leisure time.',
    iconName: 'directions-walk',
    dailyPlacesLabel: '4-5 places / day',
  },
  {
    id: 'fast',
    label: 'Fast-Paced',
    description: 'Action-packed schedule to see as much as possible.',
    iconName: 'bolt',
    dailyPlacesLabel: '6+ places / day',
  },
];

export const mockBudgetOptions: BudgetOption[] = [
  {
    id: 'budget',
    label: 'Budget',
    symbol: '$',
    rangeText: 'Under $50/day',
    description: 'Hostels, public transit, street food & free attractions',
    iconName: 'savings',
  },
  {
    id: 'moderate',
    label: 'Standard',
    symbol: '$$',
    rangeText: '$50 - $150/day',
    description: 'Comfortable hotels, casual dining & ticketed highlights',
    iconName: 'payments',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    symbol: '$$$',
    rangeText: '$150+/day',
    description: '4-5 star resorts, fine dining & private transport',
    iconName: 'diamond',
  },
];

export const mockGroupOptions: GroupOption[] = [
  {
    id: 'solo',
    label: 'Solo',
    iconName: 'person',
    travelerCountLabel: '1 traveler',
  },
  {
    id: 'couple',
    label: 'Couple',
    iconName: 'favorite',
    travelerCountLabel: '2 travelers',
  },
  {
    id: 'family',
    label: 'Family',
    iconName: 'family-restroom',
    travelerCountLabel: '3-5 travelers',
  },
  {
    id: 'friends',
    label: 'Friends',
    iconName: 'groups',
    travelerCountLabel: '3+ travelers',
  },
];

export const initialWizardState: CreateTripWizardState = {
  destination: mockPopularDestinations[0],
  customDestinationName: 'Bangkok',
  startDate: '2026-10-15',
  endDate: '2026-10-20',
  durationDays: 6,
  selectedStyles: ['culture', 'food'],
  pace: 'moderate',
  budget: 'moderate',
  groupType: 'couple',
  tripTitle: 'Bangkok Exploration 2026',
};
