import type { CategoryOption, ExploreCategory, ExplorePlace } from "../types";

export const exploreCategories: CategoryOption[] = [
  { id: "all", label: "All", iconName: "star" },
  { id: "attractions", label: "Attractions", iconName: "attractions" },
  { id: "restaurants", label: "Restaurants", iconName: "restaurant" },
  { id: "hotels", label: "Hotels", iconName: "hotel" },
  { id: "coffee", label: "Coffee", iconName: "local-cafe" },
  { id: "shopping", label: "Shopping", iconName: "shopping-bag" },
];

export const mockExplorePlaces: ExplorePlace[] = [
  {
    id: "place_wat_arun",
    name: "Wat Arun",
    category: "attractions",
    categoryLabel: "Buddhist Temple",
    rating: 4.8,
    reviewCount: 12450,
    address: "Bangkok Yai, Bangkok",
    openStatus: "Open • Closes 6 PM",
    description:
      "Wat Arun Ratchawararam Ratchawaramahawihan is a landmark Buddhist temple on the west bank of the Chao Phraya River, famous for its towering central prang adorned with porcelain.",
    imageUrl:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80",
    mapCoordinate: {
      topPercent: 38,
      leftPercent: 48,
    },
    iconName: "attractions",
  },
  {
    id: "place_grand_palace",
    name: "The Grand Palace",
    category: "attractions",
    categoryLabel: "Historical Landmark",
    rating: 4.7,
    reviewCount: 25800,
    address: "Phra Nakhon, Bangkok",
    openStatus: "Open • Closes 3:30 PM",
    description:
      "A complex of stunning buildings at the heart of Bangkok that has served as the official residence of the Kings of Siam since 1782.",
    imageUrl:
      "https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=600&q=80",
    mapCoordinate: {
      topPercent: 28,
      leftPercent: 62,
    },
    iconName: "attractions",
  },
  {
    id: "place_thip_samai",
    name: "Thip Samai Pad Thai",
    category: "restaurants",
    categoryLabel: "Thai Restaurant",
    rating: 4.5,
    reviewCount: 8900,
    address: "Maha Chai Rd, Samran Rat",
    openStatus: "Open • Closes 11 PM",
    description:
      "Legendary destination widely acclaimed for serving some of the finest traditional Pad Thai prepared over charcoal fires.",
    imageUrl:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80",
    mapCoordinate: {
      topPercent: 52,
      leftPercent: 35,
    },
    iconName: "restaurant",
  },
  {
    id: "place_blue_whale",
    name: "Blue Whale Cafe",
    category: "coffee",
    categoryLabel: "Specialty Coffee",
    rating: 4.6,
    reviewCount: 2300,
    address: "Maha Rat Rd, Phra Borom Maha Ratchawang",
    openStatus: "Open • Closes 6 PM",
    description:
      "Charming multi-story cafe situated near Wat Pho famous for its butterfly pea blue lattes and ocean-themed aesthetics.",
    imageUrl:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80",
    mapCoordinate: {
      topPercent: 44,
      leftPercent: 58,
    },
    iconName: "local-cafe",
  },
  {
    id: "place_factory_coffee",
    name: "Factory Coffee",
    category: "coffee",
    categoryLabel: "Specialty Cafe",
    rating: 4.9,
    reviewCount: 4200,
    address: "Phaya Thai Rd, Ratchathewi",
    openStatus: "Open • Closes 5 PM",
    description:
      "Award-winning specialty roastery and cafe known for innovative signature espresso drinks crafted by champion baristas.",
    imageUrl:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80",
    mapCoordinate: {
      topPercent: 68,
      leftPercent: 72,
    },
    iconName: "local-cafe",
  },
  {
    id: "place_iconsiam",
    name: "ICONSIAM",
    category: "shopping",
    categoryLabel: "Shopping Complex",
    rating: 4.6,
    reviewCount: 31200,
    address: "Sukhumvit Rd, Khlong Toei, Bangkok",
    openStatus: "Open • Closes 10 PM",
    description:
      "Mega-mall along Sukhumvit featuring luxury retail, high-end dining, and world-class flagship stores.",
    imageUrl:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=80",
    mapCoordinate: {
      topPercent: 78,
      leftPercent: 42,
    },
    iconName: "shopping-bag",
  },
  {
    id: "place_the_siam",
    name: "The Siam Hotel",
    category: "hotels",
    categoryLabel: "Luxury Boutique Resort",
    rating: 4.9,
    reviewCount: 1600,
    address: "Khao Rd, Wachira Phayaban",
    openStatus: "24 Hours",
    description:
      "Art deco inspired luxury urban resort set in lush gardens along the Chao Phraya River with private pool villas and antique collections.",
    imageUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    mapCoordinate: {
      topPercent: 18,
      leftPercent: 32,
    },
    iconName: "hotel",
  },
];

export function generateLargeMockExplorePlaces(count = 50): ExplorePlace[] {
  const categories: ExploreCategory[] = [
    "attractions",
    "restaurants",
    "hotels",
    "coffee",
    "shopping",
  ];
  const categoryLabels: Record<ExploreCategory, string> = {
    all: "All",
    attractions: "Attractions",
    restaurants: "Restaurant",
    hotels: "Hotel",
    coffee: "Cafe",
    shopping: "Shopping Mall",
  };
  const iconNames: Record<ExploreCategory, CategoryOption["iconName"]> = {
    all: "star",
    attractions: "attractions",
    restaurants: "restaurant",
    hotels: "hotel",
    coffee: "local-cafe",
    shopping: "shopping-bag",
  };

  const places: ExplorePlace[] = [];

  for (let i = 1; i <= count; i++) {
    const isBase = i <= mockExplorePlaces.length;
    const basePlace = mockExplorePlaces[(i - 1) % mockExplorePlaces.length];
    const category = isBase
      ? basePlace.category
      : categories[i % categories.length];

    places.push({
      id: `place_large_${i}`,
      name: isBase ? basePlace.name : `${basePlace.name} #${i}`,
      category,
      categoryLabel: isBase
        ? basePlace.categoryLabel
        : categoryLabels[category],
      rating: isBase ? basePlace.rating : +(4.0 + (i % 10) * 0.1).toFixed(1),
      reviewCount: isBase ? basePlace.reviewCount : 500 + i * 150,
      address: isBase ? basePlace.address : `${basePlace.address} (Zone ${i})`,
      openStatus: basePlace.openStatus,
      description: `${basePlace.description} (Item #${i} for scalability testing)`,
      imageUrl: basePlace.imageUrl,
      mapCoordinate: {
        topPercent:
          ((basePlace.mapCoordinate.topPercent + ((i * 3) % 40)) % 90) + 5,
        leftPercent:
          ((basePlace.mapCoordinate.leftPercent + ((i * 5) % 40)) % 90) + 5,
      },
      iconName: isBase ? basePlace.iconName : iconNames[category],
    });
  }

  return places;
}

export const largeMockExplorePlaces: ExplorePlace[] =
  generateLargeMockExplorePlaces(50);
