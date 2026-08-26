const fs = require('fs');

function inject(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  for (const [search, replace] of replacements) {
    code = code.replace(search, replace);
  }
  fs.writeFileSync(file, code);
}

// 1. AuthProvider
inject('src/features/auth/AuthProvider.tsx', [
  ['authRepository.restoreSession()', '(() => { if(__DEV__) console.log("[PER] AUTH_RESTORE_START duration=0", performance.now()); return authRepository.restoreSession(); })()'],
  ['void applyUser(session?.user ?? null);', 'if(__DEV__) console.log("[PER] AUTH_SESSION_READY duration=", performance.now()); void applyUser(session?.user ?? null);'],
  ['const profile = await profileRepository.getOwnProfile(user.id);', 'if(__DEV__) console.log("[PER] PROFILE_FETCH_START duration=", performance.now()); const profile = await profileRepository.getOwnProfile(user.id); if(__DEV__) console.log("[PER] PROFILE_FETCH_END duration=", performance.now());'],
  ['<AuthContext.Provider', '(()>{ if(__DEV__) console.log("[PERF] MAIN_NAV_READY duration=", performance.now()); return <AuthContext.Provider'],
  ['{children}</AuthContext.Provider>', '{children}</AuthContext.Provider>; })()']
]);

// 2. HomeScreen
inject('src/features/home/HomeScreen.tsx', [
  ['const data: HomeData = useMemo', 'if(__DEV__) console.log("[PERF] HOME_MOUNT duration=", performance.now()); const data: HomeData = useMemo'],
  ['void effectiveRepository.getUpcomingTrip', 'if(__DEV__) console.log("[PERF] HOME_LIST_START duration=", performance.now()); void effectiveRepository.getUpcomingTrip'],
  ['setRemoteTrip(mappedTrip);', 'if(__DEV__) console.log("[PERF] HOME_LIST_END duration=", performance.now()); setRemoteTrip(mappedTrip);'],
  ['status === "loading" ?', '(()=>{ if(__DEV__ && status !== "loading") console.log("[PERF] HOME_MEANINGFUL duration=", performance.now()); return status === "loading" ?']
]);

// 3. MyTripsScreen
inject('src/features/trips/screens/MyTripsScreen.tsx', [
  ['const sections = useMemo', 'if(__DEV__) console.log("[PER] TRIPS_TAP/FLOW_START duration=", performance.now()); if(__DEV__) console.log("[PER] TRIPS_MOUNT duration=", performance.now()); const sections = useMemo'],
  ['const promise = effectiveRepository.listTrips', 'if(__DEV__) console.log("[PER] TRIPS_LIST_START duration=", performance.now()); const promise = effectiveRepository.listTrips'],
  ['setRemoteSections(sections);', 'if(__DEV__) console.log("[PER] TRIPS_LIST_END duration=", performance.now()); setRemoteSections(sections);'],
  ['status === "loading" ?', '(()>{ if(__DEV__ && status !== "loading") console.log("[PERF] TRIPS_CONTENT_READY duration=", performance.now()); return status === "loading" ?']
]);

// 4. TripDetailScreen
inject('src/features/trips/screens/TripDetailScreen.tsx', [
  ['const tripData: TripDetailData | null', 'if(__DEV__) console.log("[PERF] DETAIL_MOUNT duration=", performance.now()); const tripData: TripDetailData | null'],
  ['const promise = effectiveRepository.getTrip', 'if(__DEV__) console.log("[PER] DETAIL_RPC_START duration=", performance.now()); const promise = effectiveRepository.getTrip'],
  ['setRemoteTripData(trip);', 'if(__DEV__) console.log("[PER] DETAIL_RPC_END duration=", performance.now()); setRemoteTripData(trip);'],
  ['status === "loading" ?', '(()=>{ if(__DEV__ && status !== "loading") console.log("[PERF] DETAIL_TEXT_READY duration=", performance.now()); return status === "loading" ?'],
  ['{heroImage ? (', '(()=>{ if(__DEV__ && heroImage) console.log("[PER] DETAIL_FIRST_IMAGE duration=", performance.now()); return heroImage ? (']
]);

// 5. SavedPlacesScreen & useSavedPlaces
inject('src/features/saved/screens/SavedPlacesScreen.tsx', [
  ['const { savedPlaces, status', 'if(__DEV__) console.log("[PERF] SAVED_MOUNT duration=", performance.now()); const { savedPlaces, status'],
  ['status === "loading" ?', '(()=>{ if(__DEV__ && status !== "loading") console.log("[PERF] SAVED_CONTENT_READY duration=", performance.now()); return status === "loading" ?']
]);
if (fs.existsSync('src/features/saved/hooks/useSavedPlaces.ts')) {
  inject('src/features/saved/hooks/useSavedPlaces.ts', [
    ['const page = await effectiveRepository.listSavedPlaces', 'if(__DEV__) console.log("[PER] SAVED_LIST_START duration=", performance.now()); const page = await effectiveRepository.listSavedPlaces'],
    ['setRemotePlaces(uiItems);', 'if(__DEV__) console.log("[PERF] SAVED_LIST_END duration=", performance.now()); setRemotePlaces(uiItems);'],
    ['if (metadata.rating !== undefined', 'if(__DEV__) console.log("[PER] SAVED_FIRST_ENRICHMENT duration=", performance.now()); if (metadata.rating !== undefined']
  ]);
}

// 6. ProfileScreen
inject('src/features/profile/screens/ProfileScreen.tsx', [
  ['const { profile } = useAuth();', 'if(__DEV__) console.log("[PERF] PROFILE_SCREEN_MOUNT duration=", performance.now()); const { profile } = useAuth();'],
  ['const promise = effectiveStatsRepository.getUserStats', 'if(__DEV__) console.log("[PERF] STATS_START duration=", performance.now()); const promise = effectiveStatsRepository.getUserStats'],
  ['setRemoteStats(stats);', 'if(__DEV__) console.log("[PER] STATS_END duration=", performance.now()); setRemoteStats(stats);'],
  ['status === "loading" ?', '(()=>{ if(__DEV__ && status !== "loading") console.log("[PERF] PROFILE_MEANINGFUL duration=", performance.now()); return status === "loading" ?']
]);

console.log("Instrumentation complete.");
