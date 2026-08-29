import type MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type DestinationOption = {
  id: string;
  name: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
  imageUrl: string;
  /** Editorial or provider-derived geographic context used only for a destination cover lookup. */
  imageQuery?: string;
  destinationType?: 'CITY' | 'COUNTRY';
  tag?: string;
  popular?: boolean;
};

export type TravelStyleOption = {
  id: string;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  description: string;
};

export type TravelPace = 'relaxed' | 'moderate' | 'fast';

export type PaceOption = {
  id: TravelPace;
  label: string;
  description: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  dailyPlacesLabel: string;
};

export type BudgetTier = 'budget' | 'moderate' | 'luxury';

export type BudgetOption = {
  id: BudgetTier;
  label: string;
  symbol: string;
  rangeText: string;
  description: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
};

export type GroupType = 'solo' | 'couple' | 'family' | 'friends';

export type GroupOption = {
  id: GroupType;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  travelerCountLabel: string;
};

export type CreateTripWizardState = {
  destination: DestinationOption | null;
  customDestinationName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  selectedStyles: string[];
  pace: TravelPace;
  budget: BudgetTier;
  groupType: GroupType;
  tripTitle: string;
};

export type WizardStepNumber = 1 | 2 | 3 | 4 | 5;

export type WizardStatus = 'editing' | 'generating' | 'success';
