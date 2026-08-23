import type { ItineraryItem, TripDayItinerary, TripDetailData } from '../types';

export const mockBangkokTripDetail: TripDetailData = {
  id: 'trip_bangkok',
  title: 'Bangkok Adventure',
  destination: 'Bangkok, Thailand',
  startDate: '2026-10-12',
  endDate: '2026-10-18',
  dateLabel: 'Oct 12 - Oct 18 • 6 Days',
  durationDays: 6,
  heroImageUrl:
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
  budgetSpent: '$1,200',
  budgetTotal: '$1,500',
  budgetPercent: 80,
  savedPlacesCount: 14,
  travelers: [
    {
      id: 'u1',
      name: 'John Smith',
      initials: 'JS',
      colorVariant: 'secondary',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    {
      id: 'u2',
      name: 'Maya King',
      initials: 'MK',
      colorVariant: 'tertiary',
      avatarUrl:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    },
  ],
  days: [
    {
      id: 'day_1',
      dayNumber: 1,
      date: '2026-10-12',
      dateLabel: 'Day 1 • Oct 12',
      title: 'Riverside & Old Town Highlights',
      items: [
        {
          id: 'item_1_1',
          type: 'restaurant',
          time: '09:00',
          timePeriod: 'AM',
          title: 'Breakfast at Ro Roast',
          subtitle: 'Trendy cafe with great cold brew.',
          description: 'Specialty cafe serving single-origin coffees and breakfast pastries.',
          iconName: 'restaurant',
          iconBgVariant: 'secondary',
          placeId: 'place_factory_coffee',
        },
        {
          id: 'item_1_2',
          type: 'place',
          time: '11:00',
          timePeriod: 'AM',
          title: 'Wat Arun (Temple of Dawn)',
          subtitle:
            'Iconic riverside temple with intricate porcelain detailing. Best to arrive early.',
          description:
            'Iconic riverside temple with intricate porcelain detailing. Best to arrive early.',
          imageUrl:
            'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
          iconName: 'account-balance',
          iconBgVariant: 'tertiary',
          placeId: 'place_wat_arun',
          directionsLabel: 'Get Directions',
        },
        {
          id: 'item_1_3',
          type: 'restaurant',
          time: '01:30',
          timePeriod: 'PM',
          title: 'Lunch at Supanniga Eating Room',
          subtitle: 'Traditional Thai recipes by the river.',
          description: 'Acclaimed authentic Thai cuisine with river views.',
          iconName: 'restaurant',
          iconBgVariant: 'secondary',
          placeId: 'place_thip_samai',
        },
        {
          id: 'item_1_4',
          type: 'place',
          time: '03:30',
          timePeriod: 'PM',
          title: 'The Grand Palace & Wat Phra Kaew',
          subtitle: 'Historic royal complex with sacred Emerald Buddha.',
          description: 'Historic royal complex with sacred Emerald Buddha.',
          imageUrl:
            'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=600&q=80',
          iconName: 'account-balance',
          iconBgVariant: 'tertiary',
          placeId: 'place_grand_palace',
          directionsLabel: 'Get Directions',
        },
      ],
    },
    {
      id: 'day_2',
      dayNumber: 2,
      date: '2026-10-13',
      dateLabel: 'Day 2 • Oct 13',
      title: 'Modern Bangkok & Markets',
      items: [
        {
          id: 'item_2_1',
          type: 'restaurant',
          time: '10:00',
          timePeriod: 'AM',
          title: 'Factory Coffee Barista Brunch',
          subtitle: 'Signature espresso mocktails and brunch.',
          iconName: 'restaurant',
          iconBgVariant: 'secondary',
          placeId: 'place_factory_coffee',
        },
        {
          id: 'item_2_2',
          type: 'place',
          time: '01:00',
          timePeriod: 'PM',
          title: 'ICONSIAM & SookSiam Floating Market',
          subtitle: 'Indoor cultural market and flagship riverside mall.',
          imageUrl:
            'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=80',
          iconName: 'shopping-bag',
          iconBgVariant: 'primary',
          placeId: 'place_iconsiam',
          directionsLabel: 'Get Directions',
        },
        {
          id: 'item_2_3',
          type: 'restaurant',
          time: '06:30',
          timePeriod: 'PM',
          title: 'Dinner at Thip Samai Pad Thai',
          subtitle: 'Legendary orange charcoal cooked Pad Thai.',
          iconName: 'restaurant',
          iconBgVariant: 'secondary',
          placeId: 'place_thip_samai',
        },
      ],
    },
    {
      id: 'day_3',
      dayNumber: 3,
      date: '2026-10-14',
      dateLabel: 'Day 3 • Oct 14',
      title: 'Parks & Rooftops',
      items: [
        {
          id: 'item_3_1',
          type: 'place',
          time: '08:30',
          timePeriod: 'AM',
          title: 'Lumphini Park Morning Walk',
          subtitle: 'Lush green oasis with monitor lizards and quiet lakes.',
          iconName: 'park',
          iconBgVariant: 'primary',
        },
        {
          id: 'item_3_2',
          type: 'place',
          time: '05:30',
          timePeriod: 'PM',
          title: 'Sunset at King Power Mahanakhon SkyWalk',
          subtitle: 'Glass floor observatory at 314 meters height.',
          imageUrl:
            'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
          iconName: 'photo-camera',
          iconBgVariant: 'tertiary',
          directionsLabel: 'Get Directions',
        },
      ],
    },
    {
      id: 'day_4',
      dayNumber: 4,
      date: '2026-10-15',
      dateLabel: 'Day 4 • Oct 15',
      title: 'Canal Tours & Art',
      items: [
        {
          id: 'item_4_1',
          type: 'activity',
          time: '10:00',
          timePeriod: 'AM',
          title: 'Thonburi Khlong Longtail Boat Tour',
          subtitle: 'Glide through traditional stilt houses and orchid farms.',
          iconName: 'directions-boat',
          iconBgVariant: 'primary',
        },
      ],
    },
    {
      id: 'day_5',
      dayNumber: 5,
      date: '2026-10-16',
      dateLabel: 'Day 5 • Oct 16',
      title: 'Relaxation & Spa',
      items: [
        {
          id: 'item_5_1',
          type: 'activity',
          time: '02:00',
          timePeriod: 'PM',
          title: 'Traditional Thai Massage & Herbal Spa',
          subtitle: 'Aromatherapy and rejuvenating herbal compress treatments.',
          iconName: 'spa',
          iconBgVariant: 'secondary',
        },
      ],
    },
    {
      id: 'day_6',
      dayNumber: 6,
      date: '2026-10-17',
      dateLabel: 'Day 6 • Oct 17',
      title: 'Free Exploration & Farewell',
      items: [], // Empty day for testing empty state
    },
  ],
};

export const mockKyotoTripDetail: TripDetailData = {
  id: 'trip_kyoto',
  title: 'Kyoto Autumn Retreat',
  destination: 'Kyoto, Japan',
  startDate: '2026-10-14',
  endDate: '2026-10-22',
  dateLabel: 'Oct 14 - Oct 22 • 8 Days',
  durationDays: 8,
  heroImageUrl:
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
  budgetSpent: '$1,850',
  budgetTotal: '$2,400',
  budgetPercent: 77,
  savedPlacesCount: 18,
  travelers: [
    {
      id: 'u1',
      name: 'John Smith',
      initials: 'JS',
      colorVariant: 'secondary',
    },
    {
      id: 'u2',
      name: 'Maya King',
      initials: 'MK',
      colorVariant: 'tertiary',
    },
  ],
  days: [
    {
      id: 'day_kyoto_1',
      dayNumber: 1,
      date: '2026-10-14',
      dateLabel: 'Day 1 • Oct 14',
      title: 'Higashiyama Exploration',
      items: [
        {
          id: 'item_k1_1',
          type: 'place',
          time: '08:00',
          timePeriod: 'AM',
          title: 'Kiyomizu-dera Temple',
          subtitle: 'Historic wooden stage with panoramic city views.',
          imageUrl:
            'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
          iconName: 'account-balance',
          iconBgVariant: 'tertiary',
          directionsLabel: 'Get Directions',
        },
        {
          id: 'item_k1_2',
          type: 'place',
          time: '11:30',
          timePeriod: 'AM',
          title: 'Sannenzaka & Ninenzaka Streets',
          subtitle: 'Traditional preserved cobblestone alleys with tea houses.',
          iconName: 'storefront',
          iconBgVariant: 'primary',
        },
      ],
    },
  ],
};

export const mockTripDetailDictionary: Record<string, TripDetailData> = {
  trip_bangkok: mockBangkokTripDetail,
  trip_kyoto: mockKyotoTripDetail,
};

let dynamicTripDetails: Record<string, TripDetailData> = {};

export function getMockTripDetail(tripId: string): TripDetailData | null {
  if (dynamicTripDetails[tripId]) {
    return dynamicTripDetails[tripId];
  }
  if (mockTripDetailDictionary[tripId]) {
    const cloned = JSON.parse(JSON.stringify(mockTripDetailDictionary[tripId])) as TripDetailData;
    dynamicTripDetails[tripId] = cloned;
    return cloned;
  }
  if (tripId.startsWith('trip_')) {
    // Return Bangkok as standard fallback with adjusted ID and title
    const fallback: TripDetailData = {
      ...JSON.parse(JSON.stringify(mockBangkokTripDetail)),
      id: tripId,
      title: tripId.replace('trip_', '').replace('_', ' ').toUpperCase(),
    };
    dynamicTripDetails[tripId] = fallback;
    return fallback;
  }
  return null;
}

export function addPlaceToTripItinerary(
  tripId: string,
  dayId: string,
  item: ItineraryItem
): TripDetailData | null {
  const current = getMockTripDetail(tripId);
  if (!current) {
    return null;
  }

  const updatedDays = current.days.map((day) => {
    if (day.id === dayId) {
      return {
        ...day,
        items: [...day.items, item],
      };
    }
    return day;
  });

  const updatedTrip: TripDetailData = {
    ...current,
    days: updatedDays,
  };

  dynamicTripDetails[tripId] = updatedTrip;
  return updatedTrip;
}

export function resetMockTripDetail(tripId?: string): void {
  if (tripId) {
    delete dynamicTripDetails[tripId];
  } else {
    dynamicTripDetails = {};
  }
}

export function generateLargeMockTripDetail(
  daysCount = 7,
  itemsPerDay = 8
): TripDetailData {
  const days: TripDayItinerary[] = [];

  const sampleItems = [
    {
      title: 'Morning Matcha & Pastry',
      subtitle: 'Artisanal local cafe with garden seating.',
      iconName: 'local-cafe' as const,
      iconBgVariant: 'secondary' as const,
      type: 'restaurant' as const,
    },
    {
      title: 'Ancient Shrine Visit',
      subtitle: 'Serene temple grounds with centuries of heritage.',
      iconName: 'account-balance' as const,
      iconBgVariant: 'tertiary' as const,
      imageUrl:
        'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
      type: 'place' as const,
      directionsLabel: 'Get Directions',
    },
    {
      title: 'Traditional Market Exploration',
      subtitle: 'Local stalls with street delicacies and souvenirs.',
      iconName: 'shopping-bag' as const,
      iconBgVariant: 'primary' as const,
      type: 'place' as const,
    },
    {
      title: 'Scenic River Walk',
      subtitle: 'Shaded riverside path with landmark views.',
      iconName: 'directions-walk' as const,
      iconBgVariant: 'primary' as const,
      type: 'activity' as const,
    },
  ];

  for (let d = 1; d <= daysCount; d++) {
    const items = [];
    for (let i = 1; i <= itemsPerDay; i++) {
      const template = sampleItems[(i - 1) % sampleItems.length];
      const hour = 8 + Math.floor(i * 1.4);
      const timeStr = `${String(hour > 12 ? hour - 12 : hour).padStart(2, '0')}:${i % 2 === 0 ? '30' : '00'}`;
      const period = hour >= 12 ? ('PM' as const) : ('AM' as const);

      items.push({
        id: `stress_item_d${d}_i${i}`,
        type: template.type,
        time: timeStr,
        timePeriod: period,
        title: `${template.title} #${i}`,
        subtitle: `${template.subtitle} (Day ${d}, Stop ${i})`,
        description: template.subtitle,
        imageUrl: i % 2 === 0 ? template.imageUrl : undefined,
        iconName: template.iconName,
        iconBgVariant: template.iconBgVariant,
        directionsLabel: template.directionsLabel,
      });
    }

    days.push({
      id: `stress_day_${d}`,
      dayNumber: d,
      date: `2026-10-${11 + d}`,
      dateLabel: `Day ${d} • Oct ${11 + d}`,
      title: `Day ${d} Itinerary Exploration`,
      items,
    });
  }

  return {
    ...mockBangkokTripDetail,
    id: 'trip_large_stress',
    title: 'Large Itinerary Scalability Test',
    durationDays: daysCount,
    days,
  };
}
