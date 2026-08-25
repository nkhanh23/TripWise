import { useNavigation } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppText } from "../../components/AppText";
import { useTranslation } from "../../i18n";
import { SequentialTripCoverImageRepository } from "../../integration/imageResolution";
import type {
  SavedTripsRepository,
  TripCoverImageRepository,
} from "../../integration/repositories";
import { SupabasePlacePhotoRepository } from "../../integration/remote/supabasePlacePhotoRepository";
import { SupabaseSavedTripsRepository } from "../../integration/remote/supabaseTripRepositories";
import { SupabaseWikimediaImageRepository } from "../../integration/remote/supabaseWikimediaImageRepository";
import { supabase } from "../../lib/supabase/client";
import { useTheme } from "../../theme";
import { spacing, typography } from "../../theme/tokens";
import { HomeContinuePlanningCard } from "./components/HomeContinuePlanningCard";
import { HomeEmptyHero } from "./components/HomeEmptyHero";
import { HomeExplorePreview } from "./components/HomeExplorePreview";
import { HomeLoadingSkeleton } from "./components/HomeLoadingSkeleton";
import { HomeQuickActions } from "./components/HomeQuickActions";
import { HomeSavedSection } from "./components/HomeSavedSection";
import { HomeTopBar } from "./components/HomeTopBar";
import { HomeUpcomingCard } from "./components/HomeUpcomingCard";
import { mockHomeEmptyData, mockHomePopulatedData } from "./data/mockHome";
import type { HomeData, HomeUIStatus } from "./types";

type Props = {
  initialStatus?: HomeUIStatus;
  customData?: HomeData;
  fixtureMode?: boolean;
  repository?: SavedTripsRepository;
  tripCoverRepository?: TripCoverImageRepository;
  onNavigatePlan?: () => void;
  onNavigateExplore?: () => void;
  onNavigateTrips?: () => void;
  onNavigateSaved?: () => void;
  onNavigateProfile?: () => void;
  onNavigateTripDetail?: (tripId: string) => void;
  onNavigateCreateTrip?: () => void;
  onNavigatePlaceDetail?: (placeId: string) => void;
};

export const HomeScreen = memo(function HomeScreen({
  initialStatus = "ready",
  customData,
  fixtureMode = false,
  repository,
  tripCoverRepository,
  onNavigatePlan,
  onNavigateExplore,
  onNavigateTrips,
  onNavigateSaved,
  onNavigateProfile,
  onNavigateTripDetail,
  onNavigateCreateTrip,
  onNavigatePlaceDetail,
}: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { formatDateRange, t } = useTranslation();
  const [status, setStatus] = useState<HomeUIStatus>(initialStatus);
  const [remoteTrip, setRemoteTrip] = useState<HomeData["upcomingTrip"]>(null);

  const effectiveRepository = useMemo(
    () => repository ?? new SupabaseSavedTripsRepository(supabase),
    [repository],
  );
  const effectiveTripCoverRepository = useMemo(() => {
    if (tripCoverRepository) return tripCoverRepository;
    const google = new SupabasePlacePhotoRepository(supabase);
    const wikimedia = new SupabaseWikimediaImageRepository(supabase);
    return new SequentialTripCoverImageRepository(google, wikimedia, wikimedia);
  }, [tripCoverRepository]);

  useEffect(() => {
    if (customData || fixtureMode || initialStatus !== "ready")
      return undefined;
    const controller = new AbortController();
    setStatus("loading");
    void effectiveRepository
      .list({ limit: 20 }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = page.items
          .filter((trip) => trip.endDate >= today)
          .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
        const mappedTrip: HomeData["upcomingTrip"] = upcoming
          ? {
              id: upcoming.id,
              title: upcoming.title,
              dateLabel: formatDateRange(upcoming.startDate, upcoming.endDate),
              badgeText: t("home.upcoming"),
              destination: upcoming.destination,
            }
          : null;
        setRemoteTrip(mappedTrip);
        setStatus(upcoming ? "ready" : "empty");
        if (upcoming && mappedTrip) {
          void effectiveTripCoverRepository
            .getTripCover(
              {
                googlePlaceIds: upcoming.coverGooglePlaceIds,
                destination: upcoming.destination,
                maxWidth: 900,
              },
              controller.signal,
            )
            .then((image) => {
              if (image.uri && !controller.signal.aborted) {
                setRemoteTrip({
                  ...mappedTrip,
                  imageUrl: image.uri,
                  resolvedImage: image,
                });
              }
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("empty");
      });
    return () => controller.abort();
  }, [
    customData,
    effectiveRepository,
    effectiveTripCoverRepository,
    fixtureMode,
    formatDateRange,
    initialStatus,
    t,
  ]);

  const data: HomeData = useMemo(() => {
    if (customData) return customData;
    if (fixtureMode)
      return initialStatus === "empty"
        ? mockHomeEmptyData
        : mockHomePopulatedData;
    return {
      greeting: "",
      subtitle: "",
      upcomingTrip: remoteTrip,
      draftTrip: null,
      savedPlaces: [],
    };
  }, [customData, fixtureMode, initialStatus, remoteTrip]);

  // Navigation handlers
  const handlePlan = useCallback(() => {
    if (onNavigatePlan) onNavigatePlan();
    else navigation.navigate("Plan");
  }, [onNavigatePlan, navigation]);

  const handleExplore = useCallback(() => {
    if (onNavigateExplore) onNavigateExplore();
    else navigation.navigate("Explore");
  }, [onNavigateExplore, navigation]);

  const handleTrips = useCallback(() => {
    if (onNavigateTrips) onNavigateTrips();
    else navigation.navigate("Trips");
  }, [onNavigateTrips, navigation]);

  const handleSaved = useCallback(() => {
    if (onNavigateSaved) onNavigateSaved();
    else navigation.navigate("Saved");
  }, [onNavigateSaved, navigation]);

  const handleProfile = useCallback(() => {
    if (onNavigateProfile) onNavigateProfile();
    else navigation.navigate("Profile");
  }, [onNavigateProfile, navigation]);

  const handleTripDetail = useCallback(
    (tripId: string) => {
      if (onNavigateTripDetail) onNavigateTripDetail(tripId);
      else navigation.navigate("TripDetail", { tripId });
    },
    [onNavigateTripDetail, navigation],
  );

  const handleCreateTrip = useCallback(() => {
    if (onNavigateCreateTrip) onNavigateCreateTrip();
    else navigation.navigate("CreateTripWizard");
  }, [onNavigateCreateTrip, navigation]);

  const handlePlaceDetail = useCallback(
    (placeId: string) => {
      if (onNavigatePlaceDetail) onNavigatePlaceDetail(placeId);
      else navigation.navigate("PlaceDetail", { placeId });
    },
    [onNavigatePlaceDetail, navigation],
  );

  const hasUpcomingTrip = Boolean(data.upcomingTrip);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.surface }]}
    >
      {/* 1. Top App Bar */}
      <HomeTopBar onPressMenu={handleProfile} onPressProfile={handleProfile} />

      {/* 2. Loading State */}
      {status === "loading" ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <HomeLoadingSkeleton />
        </ScrollView>
      ) : (
        /* 3. Main Content (Populated or Empty) */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting Section */}
          <View style={styles.greetingWrap}>
            <Text
              style={[styles.greetingTitle, { color: colors.text.primary }]}
            >
              {hasUpcomingTrip ? t("home.greeting") : t("home.greetingMorning")}
            </Text>
            <AppText style={styles.greetingSubtitle}>
              {hasUpcomingTrip ? t("home.subtitle") : t("home.subtitleMorning")}
            </AppText>
          </View>

          {/* Hero Section */}
          {hasUpcomingTrip && data.upcomingTrip ? (
            <HomeUpcomingCard
              onPressViewItinerary={handleTripDetail}
              trip={data.upcomingTrip}
            />
          ) : (
            <HomeEmptyHero onCreateTrip={handleCreateTrip} />
          )}

          {/* Quick Actions Grid */}
          <HomeQuickActions
            onNavigateExplore={handleExplore}
            onNavigatePlan={handlePlan}
            onNavigateSaved={handleSaved}
            onNavigateTrips={handleTrips}
          />

          {/* Continue Planning & Explore Preview (Populated Mode) */}
          {hasUpcomingTrip ? (
            <View style={styles.asymmetricRow}>
              {data.draftTrip ? (
                <HomeContinuePlanningCard
                  draft={data.draftTrip}
                  onPressContinue={handleCreateTrip}
                />
              ) : null}
              {data.inspiration ? (
                <HomeExplorePreview
                  inspiration={data.inspiration}
                  onPressExplore={handleExplore}
                />
              ) : null}
            </View>
          ) : (
            /* Inspiration Preview (Empty Mode) */
            <View style={styles.inspirationWrap}>
              <View style={styles.inspirationHeaderRow}>
                <Text
                  style={[
                    styles.inspirationTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  {t("home.inspiration")}
                </Text>
                <Pressable
                  accessibilityHint={t("home.seeAll")}
                  accessibilityLabel={t("home.seeAll")}
                  accessibilityRole="button"
                  onPress={handleExplore}
                >
                  <Text
                    style={[styles.seeAllText, { color: colors.brand.primary }]}
                  >
                    {t("home.seeAll")}
                  </Text>
                </Pressable>
              </View>
              {data.inspiration ? (
                <HomeExplorePreview
                  inspiration={data.inspiration}
                  onPressExplore={handleExplore}
                />
              ) : null}
            </View>
          )}

          {/* Saved for Later Section */}
          {hasUpcomingTrip && data.savedPlaces.length > 0 ? (
            <HomeSavedSection
              onPressPlace={handlePlaceDetail}
              onPressViewAll={handleSaved}
              savedPlaces={data.savedPlaces}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.xl,
    paddingBottom: 110, // Avoid overlapping Bottom Tabs
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  greetingWrap: {
    gap: 4,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
  },
  greetingSubtitle: {
    fontSize: typography.bodySmall,
  },
  asymmetricRow: {
    flexDirection: "column",
    gap: spacing.md,
  },
  inspirationWrap: {
    gap: spacing.sm,
  },
  inspirationHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inspirationTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  seeAllText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
