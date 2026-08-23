export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  homeCountry: string;
  bio?: string;
  avatarUrl: string | null;
  tripsCount?: number;
  savedCount?: number;
  countriesCount?: number;
};

export type ProfileDraft = {
  displayName: string;
  email: string;
  homeCountry: string;
  bio: string;
  avatarUrl: string | null;
};

export type ProfileMenuItem = {
  id: string;
  label: string;
  iconName: string;
  onPress: () => void;
  isDestructive?: boolean;
};

export type ProfileMenuSectionData = {
  title: string;
  items: ProfileMenuItem[];
};

export type DestructiveActionType = 'signOut' | 'deleteAccount' | null;
