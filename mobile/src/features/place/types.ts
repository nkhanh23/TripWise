import type MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type PlaceTag = {
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
};

export type PlaceReview = {
  id: string;
  author: string;
  rating: number;
  timeAgo: string;
  content: string;
  avatarLetter: string;
};

export type PlaceDetailData = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  subtitle: string;
  rating: number;
  reviewCount: number;
  address: string;
  openStatus: string;
  openingHours: string;
  closingNotice?: string;
  entryFee: string;
  entryFeeNote?: string;
  description: string;
  heroImageUrl: string;
  galleryImageUrls: string[];
  tags: PlaceTag[];
  reviews: PlaceReview[];
};

export type PlaceDetailStatus = 'loading' | 'ready' | 'error' | 'not-found';
