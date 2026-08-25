import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import type { ProfileStatistics } from "../../../integration/contracts";
import { SupabaseSavedTripsRepository } from "../../../integration/remote/supabaseTripRepositories";
import { supabase } from "../../../lib/supabase/client";
import type { UserProfile } from "../types";

export function useProfile() {
  const auth = useAuth();
  const authenticatedUserId = auth.user?.id;
  const [statistics, setStatistics] = useState<{
    ownerId: string;
    value: ProfileStatistics;
  } | null>(null);

  useEffect(() => {
    if (auth.status !== "signedIn" || !authenticatedUserId) {
      return;
    }
    const controller = new AbortController();
    const repo = new SupabaseSavedTripsRepository(supabase);
    repo
      .getStats(controller.signal)
      .then((stats) => {
        if (!controller.signal.aborted) {
          setStatistics({ ownerId: authenticatedUserId, value: stats });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatistics({
            ownerId: authenticatedUserId,
            value: { tripsCount: 0, savedPlacesCount: 0 },
          });
        }
      });
    return () => controller.abort();
  }, [auth.status, authenticatedUserId]);

  const visibleStatistics =
    statistics && statistics.ownerId === authenticatedUserId
      ? statistics.value
      : { tripsCount: 0, savedPlacesCount: 0 };

  const profile = useMemo<UserProfile | null>(() => {
    if (auth.status !== "signedIn" || !auth.user) return null;
    return {
      id: auth.user.id,
      displayName:
        auth.profile?.displayName ??
        auth.user.displayName ??
        auth.user.email ??
        "TripWise traveler",
      email: auth.user.email ?? "",
      homeCountry: auth.profile?.homeCountry ?? "",
      bio: "",
      avatarUrl: auth.profile?.avatarUrl ?? null,
    };
  }, [auth.profile, auth.status, auth.user]);

  return {
    profile,
    profileStatus: auth.profileStatus,
    profileError: auth.profileError,
    refreshProfile: auth.refreshProfile,
    updateProfile: auth.updateProfile,
    tripsCount: visibleStatistics.tripsCount,
    savedCount: visibleStatistics.savedPlacesCount,
    countriesCount: 0,
    statisticsSource: "remote" as const,
  };
}
