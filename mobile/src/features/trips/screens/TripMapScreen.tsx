import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "../../../i18n";
import type { RootStackParamList } from "../../../navigation/types";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import { TripMapCanvas } from "../components/TripMapCanvas";
import { VerifiedRouteMap } from "../components/VerifiedRouteMap";
import { TripMapDaySelector } from "../components/TripMapDaySelector";
import { TripMapPlacePreview } from "../components/TripMapPlacePreview";
import { getMockTripDetail } from "../data/mockTripDetail";
import type { ItineraryItem, TripMapMarkerItem } from "../types";
import {
  deriveTripMapMarkers,
  deriveVerifiedTripMapMarkers,
} from "../utils/tripMapUtils";
import { supabase } from "../../../lib/supabase/client";
import { SupabaseSavedTripsRepository } from "../../../integration/remote/supabaseTripRepositories";
import { OsrmRouteRepository } from "../../../integration/remote/publicProviderRepositories";
import { buildDrivingRouteRequest } from "../../../integration/routePlanning";
import { mapSavedTripDetailToTripDetailData } from "../integrationMappers";
import { asTripId, isUuid } from "../../../integration/validation";
import type { Route, TripId } from "../../../integration/contracts";

type Props = NativeStackScreenProps<RootStackParamList, "TripMap"> & {
  fixtureMode?: boolean;
  customTripDetail?: ReturnType<typeof mapSavedTripDetailToTripDetailData>;
};

export const TripMapScreen = memo(function TripMapScreen({
  navigation,
  route,
  fixtureMode,
  customTripDetail,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const tripId = route.params?.tripId;
  const initialDayId = route.params?.initialDayId;
  const isRemoteTrip = Boolean(tripId && isUuid(tripId));
  const isFixture = Boolean(
    fixtureMode ||
    customTripDetail ||
    (!isRemoteTrip && tripId?.startsWith("trip_")),
  );

  const [remoteTripData, setRemoteTripData] = useState<ReturnType<
    typeof mapSavedTripDetailToTripDetailData
  > | null>(null);
  const [routeResult, setRouteResult] = useState<Route | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    if (!isRemoteTrip || isFixture || !tripId) return;
    const controller = new AbortController();
    const repository = new SupabaseSavedTripsRepository(supabase);
    let typedTripId: TripId;
    try {
      typedTripId = asTripId(tripId);
    } catch {
      setRemoteTripData(null);
      return;
    }
    void repository
      .getDetail(typedTripId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted && detail) {
          setRemoteTripData(mapSavedTripDetailToTripDetailData(detail));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRemoteTripData(null);
        }
      });
    return () => controller.abort();
  }, [isFixture, isRemoteTrip, tripId]);

  const tripData = useMemo(() => {
    if (customTripDetail) return customTripDetail;
    if (fixtureMode || (!isRemoteTrip && tripId?.startsWith("trip_"))) {
      return getMockTripDetail(tripId ?? "trip_bangkok");
    }
    if (isRemoteTrip) return remoteTripData;
    return null;
  }, [customTripDetail, fixtureMode, isRemoteTrip, remoteTripData, tripId]);

  const [selectedDayId, setSelectedDayId] = useState<string | "all">(
    initialDayId || "all",
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Synchronize selected day with available days
  useEffect(() => {
    if (!tripData?.days || tripData.days.length === 0) return;
    if (
      selectedDayId !== "all" &&
      !tripData.days.some((day) => day.id === selectedDayId)
    ) {
      const matched =
        initialDayId && tripData.days.some((day) => day.id === initialDayId);
      setSelectedDayId(
        matched ? initialDayId : (tripData.days[0]?.id ?? "all"),
      );
    }
  }, [tripData, selectedDayId, initialDayId]);

  const markerItems = useMemo(() => {
    if (!tripData) {
      return [];
    }
    return isFixture && !isRemoteTrip
      ? deriveTripMapMarkers(tripData.days, selectedDayId)
      : deriveVerifiedTripMapMarkers(tripData.days, selectedDayId);
  }, [isFixture, isRemoteTrip, tripData, selectedDayId]);

  useEffect(() => {
    if (!tripData || selectedDayId === "all") {
      setRouteResult(null);
      return;
    }
    const day = tripData.days.find((d) => d.id === selectedDayId);
    if (!day) {
      setRouteResult(null);
      return;
    }
    const verifiedItems = day.items.filter(
      (item) =>
        item.resolution === "VERIFIED" &&
        item.latitude !== undefined &&
        item.longitude !== undefined,
    );
    if (verifiedItems.length < 2) {
      setRouteResult(null);
      return;
    }

    const controller = new AbortController();
    setRouteLoading(true);
    try {
      const request = buildDrivingRouteRequest(
        {
          id: tripId as never,
          title: tripData.title,
          destination: tripData.destination,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          estimatedBudget: null,
          currency: null,
          createdAt: "",
          updatedAt: "",
          days: tripData.days.map((d) => ({
            id: d.id as never,
            dayNumber: d.dayNumber,
            date: d.date,
            summary: d.title,
            items: d.items
              .filter((item) => item.resolution === "VERIFIED")
              .map((item, index) => ({
                id: item.id as never,
                position: index + 1,
                placeName: item.title,
                resolution: "VERIFIED",
                googlePlaceId: item.googlePlaceId as never,
                latitude: item.latitude as number,
                longitude: item.longitude as number,
                placeResolvedAt: item.placeResolvedAt as string,
              })),
          })),
        },
        day.dayNumber,
      );
      const repository = new OsrmRouteRepository();
      void repository
        .getRoute(request, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setRouteResult(result);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRouteResult(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setRouteLoading(false);
        });
    } catch {
      setRouteLoading(false);
      setRouteResult(null);
    }
    return () => controller.abort();
  }, [selectedDayId, tripData, tripId]);

  // Derive active selected marker object
  const activeSelectedMarker = useMemo(() => {
    if (!selectedItemId) {
      return markerItems[0] || null;
    }
    return (
      markerItems.find((m) => m.item.id === selectedItemId) ||
      markerItems[0] ||
      null
    );
  }, [markerItems, selectedItemId]);

  const handleSelectDay = useCallback((dayId: string | "all") => {
    setSelectedDayId(dayId);
    setSelectedItemId(null);
  }, []);

  const handleSelectMarker = useCallback((marker: TripMapMarkerItem) => {
    setSelectedItemId(marker.item.id);
  }, []);

  const handleDismissSelection = useCallback(() => {
    // Keep current preview or close
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("MainTabs");
    }
  }, [navigation]);

  const handlePressPreviewItem = useCallback(
    (item: ItineraryItem) => {
      if (item.placeId) {
        navigation.navigate("PlaceDetail", { placeId: item.placeId });
      } else {
        Alert.alert(
          t("common.unavailableTitle"),
          t("common.unavailableMessage"),
        );
      }
    },
    [navigation, t],
  );

  const handlePressDirections = useCallback(
    (item: ItineraryItem) => {
      const verifiedCoordinates = markerItems
        .filter((marker) => marker.verifiedCoordinate)
        .map((marker) => marker.verifiedCoordinate!);

      navigation.navigate("RoutePreview", {
        destinationId: item.googlePlaceId ?? item.placeId ?? item.id,
        destinationName: item.title,
        coordinates:
          verifiedCoordinates.length >= 2 ? verifiedCoordinates : undefined,
      });
    },
    [markerItems, navigation],
  );

  const handleAddPlace = useCallback(() => {
    const dayIdParam =
      selectedDayId === "all" ? tripData?.days[0]?.id : selectedDayId;
    if (!isFixture) {
      Alert.alert(
        t("common.unavailableTitle"),
        t("addPlace.unavailableSubtitle"),
      );
    } else if (tripId) {
      navigation.navigate("AddPlace", {
        tripId,
        initialDayId: dayIdParam,
      });
    }
  }, [isFixture, navigation, tripId, selectedDayId, t, tripData]);

  const isDark = effectiveTheme === "dark";

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.canvas }]}
    >
      {/* Map Canvas Background */}
      {isFixture && !isRemoteTrip ? (
        <TripMapCanvas
          markerItems={markerItems}
          onDismissSelection={handleDismissSelection}
          onSelectMarker={handleSelectMarker}
          selectedItemId={activeSelectedMarker?.item.id ?? null}
        />
      ) : (
        <VerifiedRouteMap
          markers={markerItems}
          onSelectMarker={handleSelectMarker}
          route={routeResult}
          selectedItemId={activeSelectedMarker?.item.id ?? null}
        />
      )}

      {/* Floating Header Overlay */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Math.max(insets.top, spacing.sm),
            backgroundColor: isDark
              ? "rgba(19, 20, 24, 0.88)"
              : "rgba(252, 249, 248, 0.88)",
            borderBottomColor: colors.border.subtle,
          },
        ]}
      >
        <View style={styles.topRow}>
          {/* Back Button */}
          <Pressable
            accessibilityHint="Go back to trip details"
            accessibilityLabel={t("tripMap.back")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: colors.background.surface,
                borderColor: colors.border.default,
              },
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons
              color={colors.text.primary}
              name="arrow-back"
              size={22}
            />
          </Pressable>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text
              numberOfLines={1}
              style={[styles.titleText, { color: colors.text.primary }]}
            >
              {tripData?.destination
                ? `${tripData.destination.split(",")[0]} ${t("tripMap.title")}`
                : t("tripMap.title")}
            </Text>
          </View>

          {/* Spacer for symmetrical header */}
          <View style={styles.headerSpacer} />
        </View>

        {/* Day Selector Chips */}
        {tripData ? (
          <TripMapDaySelector
            days={tripData.days}
            onSelectDay={handleSelectDay}
            selectedDayId={selectedDayId}
          />
        ) : null}
      </View>

      {/* Empty State when no markers on the selected day */}
      {markerItems.length === 0 || routeLoading ? (
        <View
          style={[
            styles.emptyContainer,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          <MaterialIcons color={colors.text.muted} name="map" size={40} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            {t("tripMap.noPlaces")}
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.text.secondary }]}
          >
            {t("tripMap.noPlacesSubtitle")}
          </Text>
          <Pressable
            accessibilityHint="Add place to this day"
            accessibilityLabel={t("tripMap.addPlace")}
            accessibilityRole="button"
            onPress={handleAddPlace}
            style={({ pressed }) => [
              styles.addPlaceButton,
              { backgroundColor: colors.brand.primary },
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons color={colors.text.inverse} name="add" size={18} />
            <Text
              style={[
                styles.addPlaceButtonText,
                { color: colors.text.inverse },
              ]}
            >
              {t("tripMap.addPlace")}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Bottom Place Preview Card */}
      {activeSelectedMarker ? (
        <TripMapPlacePreview
          onPressDirections={handlePressDirections}
          onPressItem={handlePressPreviewItem}
          selectedMarker={activeSelectedMarker}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  headerWrapper: {
    borderBottomWidth: 0.5,
    elevation: 4,
    left: 0,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    top: 0,
    zIndex: 50,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 48,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  titleContainer: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  titleText: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  headerSpacer: {
    width: 38,
  },
  emptyContainer: {
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    bottom: spacing.xxl,
    elevation: 6,
    gap: spacing.xs,
    left: spacing.lg,
    padding: spacing.xl,
    position: "absolute",
    right: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    zIndex: 40,
  },
  emptyTitle: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.bodySmall,
    textAlign: "center",
  },
  addPlaceButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  addPlaceButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
