import type { PlaceDetailData } from '../types';

export const mockPlaceDetailDictionary: Record<string, PlaceDetailData> = {
  place_wat_arun: {
    id: 'place_wat_arun',
    name: 'Wat Arun',
    category: 'attractions',
    categoryLabel: 'Buddhist Temple',
    subtitle: 'Riverside Temple of Dawn',
    rating: 4.8,
    reviewCount: 12450,
    address: '158 Thanon Wang Doem, Wat Arun, Bangkok Yai, Bangkok 10600',
    openStatus: 'Open today • Closes 6 PM',
    openingHours: '08:00 - 18:00',
    closingNotice: 'Closes in 3 hours',
    entryFee: '100 THB per foreigner',
    entryFeeNote: 'Free for Thai citizens',
    description:
      'Wat Arun Ratchawararam Ratchawaramahawihan, or Wat Arun, is a landmark Buddhist temple on the west bank of the Chao Phraya River in Bangkok Yai district of Bangkok, Thailand. The temple derives its name from the Hindu god Aruna, personified as the radiations of the rising sun, and is celebrated for its majestic porcelain-encrusted central prang.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
    galleryImageUrls: [
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=600&q=80',
    ],
    tags: [
      { label: 'Historic', iconName: 'account-balance' },
      { label: 'Temple', iconName: 'attractions' },
      { label: 'Photogenic', iconName: 'photo-camera' },
    ],
    reviews: [
      {
        id: 'rev_1',
        author: 'Sarah Jenkins',
        rating: 5,
        timeAgo: '2 weeks ago',
        content:
          'Absolutely stunning details. Highly recommend going near sunset for the best photos across the river!',
        avatarLetter: 'S',
      },
      {
        id: 'rev_2',
        author: 'Marcus T.',
        rating: 4,
        timeAgo: '1 month ago',
        content:
          'Beautiful temple but very crowded during mid-day. The stairs are quite steep if you plan to climb up.',
        avatarLetter: 'M',
      },
    ],
  },
  place_grand_palace: {
    id: 'place_grand_palace',
    name: 'The Grand Palace',
    category: 'attractions',
    categoryLabel: 'Historical Landmark',
    subtitle: 'Royal Residence of Siam',
    rating: 4.7,
    reviewCount: 25800,
    address: 'Na Phra Lan Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200',
    openStatus: 'Open today • Closes 3:30 PM',
    openingHours: '08:30 - 15:30',
    closingNotice: 'Last entry at 3:00 PM',
    entryFee: '500 THB per foreigner',
    entryFeeNote: 'Includes entry to Wat Phra Kaew',
    description:
      'The Grand Palace is a complex of buildings at the heart of Bangkok that has been the official residence of the Kings of Siam (and later Thailand) since 1782.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=1200&q=80',
    galleryImageUrls: [
      'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
    ],
    tags: [
      { label: 'Royal', iconName: 'account-balance' },
      { label: 'Architecture', iconName: 'museum' },
      { label: 'Sacred', iconName: 'attractions' },
    ],
    reviews: [
      {
        id: 'rev_3',
        author: 'David Chen',
        rating: 5,
        timeAgo: '3 days ago',
        content:
          'Breathtaking architecture and gold ornamentation. Make sure to dress respectfully with covered shoulders and knees.',
        avatarLetter: 'D',
      },
    ],
  },
  place_thip_samai: {
    id: 'place_thip_samai',
    name: 'Thip Samai Pad Thai',
    category: 'restaurants',
    categoryLabel: 'Thai Restaurant',
    subtitle: 'Best Pad Thai in Bangkok',
    rating: 4.5,
    reviewCount: 8900,
    address: '313 315 Maha Chai Rd, Samran Rat, Phra Nakhon, Bangkok 10200',
    openStatus: 'Open today • Closes 11 PM',
    openingHours: '16:00 - 23:00',
    entryFee: '120 - 350 THB average',
    entryFeeNote: 'Cash and QR code accepted',
    description:
      'Known locally as Pad Thai Pratu Phi (Ghost Gate Pad Thai), Thip Samai has been serving world-renowned Pad Thai cooked in traditional woks over burning orange charcoal fires.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
    galleryImageUrls: [
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    ],
    tags: [
      { label: 'Street Food', iconName: 'restaurant' },
      { label: 'Michelin Guide', iconName: 'star' },
      { label: 'Authentic', iconName: 'local-dining' },
    ],
    reviews: [
      {
        id: 'rev_4',
        author: 'Elena R.',
        rating: 5,
        timeAgo: '1 week ago',
        content:
          'The Superb Pad Thai wrapped in a paper-thin egg crepe was genuinely the best I have ever tasted in Thailand!',
        avatarLetter: 'E',
      },
    ],
  },
  place_factory_coffee: {
    id: 'place_factory_coffee',
    name: 'Factory Coffee',
    category: 'coffee',
    categoryLabel: 'Specialty Cafe',
    subtitle: 'Champion Barista Roastery',
    rating: 4.9,
    reviewCount: 4200,
    address: '49 Phaya Thai Rd, Thanon Phaya Thai, Ratchathewi, Bangkok 10400',
    openStatus: 'Open today • Closes 5 PM',
    openingHours: '08:30 - 17:00',
    entryFee: '150 - 250 THB',
    description:
      'Award-winning specialty coffee cafe and roastery known for innovative signature espresso mocktails and champion barista brewing methods.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    galleryImageUrls: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    ],
    tags: [
      { label: 'Specialty Coffee', iconName: 'local-cafe' },
      { label: 'Award Winning', iconName: 'military-tech' },
    ],
    reviews: [
      {
        id: 'rev_5',
        author: 'Kenji S.',
        rating: 5,
        timeAgo: '4 days ago',
        content: 'Try the Moscow signature drink! World class preparation right at your table.',
        avatarLetter: 'K',
      },
    ],
  },
};

export function getMockPlaceDetail(placeId: string): PlaceDetailData | null {
  if (mockPlaceDetailDictionary[placeId]) {
    return mockPlaceDetailDictionary[placeId];
  }
  if (placeId.startsWith('place_large_')) {
    const fallback = mockPlaceDetailDictionary.place_wat_arun;
    return {
      ...fallback,
      id: placeId,
      name: `Place ${placeId.replace('place_', '')}`,
      tags: [
        { label: 'Popular', iconName: 'star' },
        { label: 'Must Visit', iconName: 'attractions' },
      ],
    };
  }
  return null;
}
