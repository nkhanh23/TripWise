export type CurrencyCode = string;

export type Money = {
  amount: number;
  currency: CurrencyCode;
};

export type DualCurrencyMoney = {
  local: Money;
  home?: Money;
  exchangeRate?: {
    rate: number;
    sourceCurrency: CurrencyCode;
    destinationCurrency: CurrencyCode;
    quotedAt: string;
    provider: string;
    freshness: 'fresh' | 'cached';
  };
};

export type ActivityFlexibility = 'fixed' | 'flexible';
export type ActivityPriority = 'must_do' | 'want_to_do' | 'optional';
export type ActivityKind =
  | 'place'
  | 'custom_activity'
  | 'restaurant'
  | 'transport'
  | 'accommodation'
  | 'reservation'
  | 'note';

export type TripContact = {
  name?: string;
  phone?: string;
  address?: string;
  websiteUrl?: string;
  bookingUrl?: string;
  reservationCode?: string;
};

export type TripExternalLink = {
  type: 'google_maps' | 'facebook' | 'instagram' | 'tiktok' | 'website' | 'booking' | 'other';
  url: string;
  label?: string;
};

export type ActualVisit = {
  arrivedAt?: string;
  departedAt?: string;
  actualDurationMinutes?: number;
};

export type TransportDetails = {
  mode: 'walk' | 'drive' | 'transit' | 'bus' | 'train' | 'flight' | 'motorbike' | 'ferry' | 'other';
  originLabel?: string;
  destinationLabel?: string;
  operatorName?: string;
  departureAt?: string;
  arrivalAt?: string;
};

export type AccommodationDetails = {
  checkInAt?: string;
  checkOutAt?: string;
  nights?: number;
};

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'activity'
  | 'shopping'
  | 'ticket'
  | 'personal'
  | 'reservation'
  | 'other';

export type ExpenseOrigin = 'planned' | 'actual' | 'unplanned';

export type TripExpense = {
  id: string;
  tripId: string;
  itineraryItemId?: string;
  category: ExpenseCategory;
  origin: ExpenseOrigin;
  amount: DualCurrencyMoney;
  note?: string;
  spentAt?: string;
};

export type ExperienceVisibility = 'private' | 'unlisted' | 'public';
export type ExperienceRating = 1 | 2 | 3 | 4 | 5;

/**
 * Private-first experience model. `public`/`unlisted` are intentionally modeled
 * now so a future social layer can publish user-approved experiences without
 * changing the core trip journal shape. Current product behavior should default
 * to `private` until an explicit social-sharing feature is implemented.
 */
export type MyExperience = {
  id: string;
  tripId: string;
  itineraryItemId?: string;
  googlePlaceId?: string;
  rating?: ExperienceRating;
  text?: string;
  wouldVisitAgain?: boolean;
  visibility: ExperienceVisibility;
  createdAt: string;
  updatedAt: string;
};

export type ExperienceSocialMetadata = {
  authorUserId: string;
  publishedAt?: string;
  shareSlug?: string;
  likeCount?: number;
  commentCount?: number;
};

export type TripExpenseSummary = {
  planned: Record<CurrencyCode, number>;
  actual: Record<CurrencyCode, number>;
  unplanned: Record<CurrencyCode, number>;
};

function addCurrencyAmount(target: Record<CurrencyCode, number>, money: Money): void {
  target[money.currency] = (target[money.currency] ?? 0) + money.amount;
}

export function summarizeTripExpenses(expenses: readonly TripExpense[]): TripExpenseSummary {
  const result: TripExpenseSummary = { planned: {}, actual: {}, unplanned: {} };

  for (const expense of expenses) {
    addCurrencyAmount(result[expense.origin], expense.amount.local);
  }

  return result;
}

export function createPrivateExperienceDraft(input: {
  id: string;
  tripId: string;
  itineraryItemId?: string;
  googlePlaceId?: string;
  now: string;
}): MyExperience {
  return {
    id: input.id,
    tripId: input.tripId,
    itineraryItemId: input.itineraryItemId,
    googlePlaceId: input.googlePlaceId,
    visibility: 'private',
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function isFlexibleActivity(value: { flexibility?: ActivityFlexibility }): boolean {
  return value.flexibility === 'flexible';
}

export function isProtectedPriority(value: { priority?: ActivityPriority }): boolean {
  return value.priority === 'must_do';
}
