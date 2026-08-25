import type { UserProfile } from "../types";

export const MOCK_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
];

export const defaultMockProfile: UserProfile = {
  id: "user_alex",
  displayName: "Sarah Jenkins",
  email: "sarah.j@example.com",
  homeCountry: "United States",
  bio: "Passionate world traveler and coffee explorer.",
  avatarUrl: MOCK_AVATARS[0],
  tripsCount: 3,
  countriesCount: 2,
};

let currentProfile: UserProfile = { ...defaultMockProfile };
let listeners: (() => void)[] = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function subscribeToProfile(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getProfile(): UserProfile {
  return { ...currentProfile };
}

export function updateProfile(draft: Partial<UserProfile>): UserProfile {
  currentProfile = {
    ...currentProfile,
    ...draft,
  };
  notifyListeners();
  return { ...currentProfile };
}

export function resetProfile(): void {
  currentProfile = { ...defaultMockProfile };
  notifyListeners();
}
