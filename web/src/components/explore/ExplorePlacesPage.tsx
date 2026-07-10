"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AppContent } from "@/components/layout/AppContent";
import { FilmGrainOverlay } from "@/components/motion/FilmGrainOverlay";
import { KineticTitle } from "@/components/motion/KineticTitle";
import { Badge } from "@/components/ui/Badge";
import { LocationSelector } from "../admin/LocationSelector";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { RetroImage } from "@/components/ui/RetroImage";
import { searchPlaces, getPlaceMapMarkers } from "@/lib/api";
import type { PlaceResponse, PageResponse, PlaceMapMarkerResponse } from "@/lib/api/contracts";
import type { MapMarkerData } from "./ExploreLeafletMap";
import {
  areViewportBoundsEqual,
  buildExploreMarkerParams,
  buildExplorePlaceSearchParams,
  DEFAULT_EXPLORE_PLACE_GROUP,
  filterMarkersByVisiblePlaces,
  MAP_MARKER_FETCH_DEBOUNCE_MS,
  resolveLocationViewport,
  type ExplorePlaceGroup,
  type ExploreViewportBounds,
  VIETNAM_BOUNDS,
} from "./explore-map-query";
import styles from "./ExplorePlacesPage.module.css";

const ExploreLeafletMap = dynamic(() => import("./ExploreLeafletMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <span className="material-symbols-outlined">map</span>
      <span>Đang tải bản đồ...</span>
    </div>
  ),
});

type ExploreCategory =
  | "Tat ca"
  | "Bien"
  | "Van hoa"
  | "An uong"
  | "Cafe"
  | "Check-in"
  | "Mua sam"
  | "Thien nhien"
  | "Khac";

type ViewState = "default" | "loading" | "empty" | "error";

type ExplorePlaceData = {
  id: string;
  name: string;
  province: string;
  city: string;
  category: ExploreCategory;
  categorySlug: string;
  tags: string[];
  rating: number;
  priceLevel: string;
  durationLabel: string;
  costLabel: string;
  imageUrl: string;
  description: string;
  lat: number;
  lng: number;
  verificationStatus: string;
};

const categoryMeta: Record<
  ExploreCategory,
  { label: string; icon: string; badge: "info" | "success" | "warn" | "neutral" }
> = {
  "Tat ca": { label: "Tất cả", icon: "apps", badge: "neutral" },
  Bien: { label: "Biển", icon: "water", badge: "info" },
  "Van hoa": { label: "Văn hóa", icon: "temple_hindu", badge: "warn" },
  "An uong": { label: "Ăn uống", icon: "restaurant", badge: "warn" },
  Cafe: { label: "Cà phê", icon: "local_cafe", badge: "neutral" },
  "Check-in": { label: "Check-in", icon: "photo_camera", badge: "success" },
  "Mua sam": { label: "Mua sắm", icon: "shopping_bag", badge: "warn" },
  "Thien nhien": { label: "Thiên nhiên", icon: "park", badge: "success" },
  Khac: { label: "Khác", icon: "place", badge: "neutral" },
};

const placeGroups: ExplorePlaceGroup[] = ["ALL", "ATTRACTION", "FOOD", "HOTEL", "SERVICE"];

const placeGroupMeta: Record<
  ExplorePlaceGroup,
  { label: string; icon: string; description: string }
> = {
  ALL: {
    label: "Tất cả",
    icon: "apps",
    description: "Hiển thị tất cả địa điểm phù hợp.",
  },
  ATTRACTION: {
    label: "Địa điểm du lịch",
    icon: "explore",
    description: "Chỉ hiển thị các địa điểm tham quan đã được lọc sạch.",
  },
  FOOD: {
    label: "Ăn uống",
    icon: "restaurant",
    description: "Khám phá quán ăn, cafe và bar phù hợp cho chuyến đi.",
  },
  HOTEL: {
    label: "Khách sạn",
    icon: "hotel",
    description: "Tìm khách sạn và nơi lưu trú phù hợp theo khu vực.",
  },
  SERVICE: {
    label: "Dịch vụ",
    icon: "miscellaneous_services",
    description: "Tìm dịch vụ du lịch, spa, và tiện ích khác.",
  },
};

const SORT_OPTIONS = [
  { value: "popularityScore_desc", label: "Phổ biến" },
  { value: "rating_desc", label: "Đánh giá cao" },
  { value: "name_asc", label: "Tên A-Z" },
  { value: "name_desc", label: "Tên Z-A" },
] as const;




const PAGE_SIZE = 20;
const MAP_MARKER_LIMIT = 200;

function normalizeSearchValue(value?: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .trim()
    .toLowerCase();
}

function normalizeCategory(value?: string): ExploreCategory {
  const normalized = normalizeSearchValue(value);

  if (normalized.includes("bien")) return "Bien";
  if (normalized.includes("van hoa")) return "Van hoa";
  if (normalized.includes("an")) return "An uong";
  if (normalized.includes("cafe")) return "Cafe";
  if (normalized.includes("check")) return "Check-in";
  if (normalized.includes("mua")) return "Mua sam";
  if (normalized.includes("thien nhien")) return "Thien nhien";

  return "Khac";
}

function imageUrlFallback(url?: string): string {
  return url && url.length > 0
    ? url
    : "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=60";
}

function mapPlaceToExplorePlace(place: PlaceResponse): ExplorePlaceData {
  return {
    id: place.id.toString(),
    name: place.name,
    province: place.province ?? "",
    city: place.city,
    category: normalizeCategory(place.categoryName),
    categorySlug: place.categorySlug ?? "",
    tags: place.tags ?? [],
    rating: place.rating ?? 0,
    priceLevel: place.priceLevel ?? "",
    durationLabel: place.durationMinutes ? `${place.durationMinutes} phút` : "30 phút",
    costLabel: place.estimatedCost
      ? `${place.estimatedCost.toLocaleString("vi-VN")} ₫`
      : "",
    imageUrl: imageUrlFallback(place.primaryImageUrl),
    description: place.description ?? "",
    lat: place.latitude ?? 12.2415,
    lng: place.longitude ?? 109.196,
    verificationStatus: place.verificationStatus ?? "UNVERIFIED",
  };
}

function toExploreMarkers(apiMarkers: PlaceMapMarkerResponse[]): MapMarkerData[] {
  return apiMarkers.map((m) => ({
    id: m.id.toString(),
    lat: m.latitude,
    lng: m.longitude,
    label: m.name,
    categorySlug: m.categorySlug,
  }));
}

function parseSortOption(value: string): { sortBy: string; sortDirection: string } {
  const [sortBy, sortDirection] = value.split("_");
  return { sortBy, sortDirection };
}

export const ExplorePlacesPage: React.FC = () => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<ExplorePlaceGroup>(DEFAULT_EXPLORE_PLACE_GROUP);
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceQuery, setProvinceQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("popularityScore_desc");
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [addToTripMenuOpen, setAddToTripMenuOpen] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [places, setPlaces] = useState<ExplorePlaceData[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [mapMarkers, setMapMarkers] = useState<MapMarkerData[]>([]);
  const [viewportBounds, setViewportBounds] = useState<ExploreViewportBounds>(VIETNAM_BOUNDS);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const hasSelectedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPlacesRequestIdRef = useRef(0);
  const latestMarkerRequestIdRef = useRef(0);
  const hasInitializedSearchRef = useRef(false);
  const previousImmediateSearchDepsRef = useRef<{
    activeGroup: ExplorePlaceGroup;
    sortOption: string;
  } | null>(null);
  const skipInitialDebouncedSearchRef = useRef(true);

  const appliedProvinceQuery = provinceQuery.trim();
  const appliedCityQuery = cityQuery.trim();
  const locationViewportPreset = useMemo(
    () => resolveLocationViewport({
      province: appliedProvinceQuery,
      city: appliedCityQuery,
    }),
    [appliedProvinceQuery, appliedCityQuery],
  );

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    return () => {
      if (markerDebounceTimerRef.current) {
        clearTimeout(markerDebounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (locationViewportPreset) {
      setMapCenter(locationViewportPreset.center);
      setViewportBounds((currentBounds) => (
        areViewportBoundsEqual(currentBounds, locationViewportPreset.bounds)
          ? currentBounds
          : locationViewportPreset.bounds
      ));
      return;
    }

    setMapCenter(undefined);

    if (!appliedProvinceQuery && !appliedCityQuery) {
      setViewportBounds((currentBounds) => (
        areViewportBoundsEqual(currentBounds, VIETNAM_BOUNDS)
          ? currentBounds
          : VIETNAM_BOUNDS
      ));
    }
  }, [appliedProvinceQuery, appliedCityQuery, locationViewportPreset]);

  const normalizeExploreError = useCallback((error: unknown) => {
    if (error instanceof TypeError) {
      return "Không thể kết nối tới backend http://localhost:8080. Hãy kiểm tra backend đã chạy chưa.";
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return "Không thể tải được danh sách địa điểm từ hệ thống.";
  }, []);

  const loadPlaces = useCallback(async (pageNum: number) => {
    const requestId = ++latestPlacesRequestIdRef.current;
    const { sortBy, sortDirection } = parseSortOption(sortOption);

    const response: PageResponse<PlaceResponse> = await searchPlaces(
      buildExplorePlaceSearchParams({
        province: appliedProvinceQuery,
        city: appliedCityQuery,
        placeType: activeGroup,
        keyword: searchQuery,
        sortBy,
        sortDirection,
        page: pageNum,
        size: PAGE_SIZE,
      }),
    );

    if (requestId !== latestPlacesRequestIdRef.current) {
      return [];
    }

    const mapped = response.content.map(mapPlaceToExplorePlace);
    setPlaces(mapped);
    setPage(response.page);
    setTotalPages(response.totalPages);
    setTotalElements(response.totalElements);
    setViewState(mapped.length === 0 ? "empty" : "default");

    if (mapped.length > 0 && !hasSelectedRef.current) {
      hasSelectedRef.current = true;
      setSelectedPlaceId(mapped[0].id);
    }

    return mapped;
  }, [
    appliedProvinceQuery,
    appliedCityQuery,
    searchQuery,
    activeGroup,
    sortOption,
  ]);

  const loadMapMarkers = useCallback(async (
    currentViewportBounds: ExploreViewportBounds,
    mappedPlaces: ExplorePlaceData[],
  ) => {
    const requestId = ++latestMarkerRequestIdRef.current;

    if (mappedPlaces.length === 0) {
      setMapMarkers([]);
      return;
    }

    try {
      const markers = await getPlaceMapMarkers(
        buildExploreMarkerParams({
          viewportBounds: currentViewportBounds,
          province: appliedProvinceQuery,
          city: appliedCityQuery,
          placeType: activeGroup,
          limit: MAP_MARKER_LIMIT,
        }),
      );
      if (requestId !== latestMarkerRequestIdRef.current) {
        return;
      }
      const visibleMarkers = filterMarkersByVisiblePlaces(
        markers,
        mappedPlaces.map((place) => place.id),
      );
      const apiMarkersMapped = toExploreMarkers(visibleMarkers);
      
      const listMarkersMapped: MapMarkerData[] = mappedPlaces.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        label: p.name,
        categorySlug: p.categorySlug,
      }));

      const mergedMarkers = [...apiMarkersMapped];
      const apiIds = new Set(mergedMarkers.map((m) => m.id));
      for (const lm of listMarkersMapped) {
        if (!apiIds.has(lm.id)) {
          mergedMarkers.push(lm);
        }
      }

      setMapMarkers(mergedMarkers);
    } catch {
      setMapMarkers([]);
    }
  }, [appliedProvinceQuery, appliedCityQuery, activeGroup]);

  const triggerSearch = useCallback(async (pageNum: number) => {
    setPage(pageNum);
    setSelectedPlaceId(null);
    setMapMarkers([]);
    hasSelectedRef.current = false;
    setViewState("loading");
    setErrorMessage(null);

    try {
      await loadPlaces(pageNum);
    } catch (error) {
      setErrorMessage(normalizeExploreError(error));
      setMapMarkers([]);
      setViewState("error");
    }
  }, [loadPlaces, normalizeExploreError]);

  const scheduleDebouncedSearch = useCallback((pageNum: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      triggerSearch(pageNum);
    }, 400);
  }, [triggerSearch]);

  useEffect(() => {
    if (!hasInitializedSearchRef.current) {
      hasInitializedSearchRef.current = true;
      previousImmediateSearchDepsRef.current = {
        activeGroup,
        sortOption,
      };
      void triggerSearch(0);
      return;
    }

    const previousDeps = previousImmediateSearchDepsRef.current;
    if (
      previousDeps?.activeGroup === activeGroup
      && previousDeps.sortOption === sortOption
    ) {
      return;
    }

    previousImmediateSearchDepsRef.current = {
      activeGroup,
      sortOption,
    };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    void triggerSearch(0);
  }, [activeGroup, sortOption, triggerSearch]);

  useEffect(() => {
    if (skipInitialDebouncedSearchRef.current) {
      skipInitialDebouncedSearchRef.current = false;
      return;
    }

    scheduleDebouncedSearch(0);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [provinceQuery, cityQuery, searchQuery, scheduleDebouncedSearch]);

  const handleViewportChange = useCallback((nextBounds: ExploreViewportBounds) => {
    setViewportBounds((currentBounds) => (
      areViewportBoundsEqual(currentBounds, nextBounds) ? currentBounds : nextBounds
    ));
  }, []);

  useEffect(() => {
    if (markerDebounceTimerRef.current) {
      clearTimeout(markerDebounceTimerRef.current);
    }

    if (viewState === "error" || places.length === 0) {
      setMapMarkers([]);
      return;
    }

    markerDebounceTimerRef.current = window.setTimeout(() => {
      void loadMapMarkers(viewportBounds, places);
    }, MAP_MARKER_FETCH_DEBOUNCE_MS);

    return () => {
      if (markerDebounceTimerRef.current) {
        clearTimeout(markerDebounceTimerRef.current);
      }
    };
  }, [loadMapMarkers, places, viewportBounds, viewState]);

  const handleSearch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    triggerSearch(0);
  }, [triggerSearch]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    void triggerSearch(newPage);
  }, [totalPages, triggerSearch]);

  const handleGroupSelect = useCallback((group: ExplorePlaceGroup) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setActiveGroup(group);
    setSelectedPlaceId(null);
    setPage(0);
    hasSelectedRef.current = false;
  }, []);

  const handlePlaceSelect = useCallback((id: string) => {
    setSelectedPlaceId(id);
    setDetailDrawerOpen(false);
  }, []);

  const handleSaveToggle = useCallback((id: string, event?: React.MouseEvent) => {
    event?.stopPropagation();

    setSavedPlaceIds((prev) => {
      if (prev.includes(id)) {
        setToastMessage("Đã bỏ lưu địa điểm này.");
        return prev.filter((pid) => pid !== id);
      }
      setToastMessage("Đã thêm vào danh sách yêu thích.");
      return [...prev, id];
    });
  }, []);

  const handleMarkerClick = useCallback((markerId: string) => {
    setSelectedPlaceId(markerId);
    setDetailDrawerOpen(false);
  }, []);

  const resetFilters = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setActiveGroup(DEFAULT_EXPLORE_PLACE_GROUP);
    setSearchQuery("");
    setProvinceQuery("");
    setCityQuery("");
    setSortOption("popularityScore_desc");
    setPage(0);
    setSelectedPlaceId(null);
    hasSelectedRef.current = false;
  }, []);

  const filteredPlaces = useMemo(() => places, [places]);

  const activePlaceObj = useMemo(
    () => places.find((p) => p.id === selectedPlaceId) ?? filteredPlaces[0] ?? null,
    [places, filteredPlaces, selectedPlaceId],
  );

  const safeMarkers: MapMarkerData[] = useMemo(
    () => mapMarkers.map((m) => ({ ...m, selected: m.id === selectedPlaceId })),
    [mapMarkers, selectedPlaceId],
  );

  const renderLoadingState = () => (
    <div className={styles.stateGrid}>
      <div className={styles.stateLeft}>
        <Skeleton variant="card" />
        <Skeleton variant="text" />
        <Skeleton variant="card" />
        <Skeleton variant="text" />
      </div>
      <div className={styles.stateRight}>
        <div className={styles.loadingMap}>
          <span className={`material-symbols-outlined ${styles.spinIcon}`}>progress_activity</span>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className={styles.stateGrid}>
      <div className={styles.stateLeftCenter}>
        <Card>
          <EmptyState
            title="Không tìm thấy địa điểm"
            message="Không có địa danh nào khớp với bộ lọc hiện tại."
            actions={<Button onClick={resetFilters}>Xóa bộ lọc</Button>}
          />
        </Card>
      </div>
      <div className={styles.stateRight}>
        <div className={styles.mapFrame}>
          <ExploreLeafletMap markers={[]} />
        </div>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className={styles.stateGrid}>
      <div className={styles.stateLeftCenter}>
        <Card title="Đã có lỗi xảy ra">
          <ErrorBanner
            message={errorMessage ?? "Không thể tải được danh sách địa điểm từ hệ thống."}
            onRetry={() => { void triggerSearch(0); }}
          />
        </Card>
      </div>
      <div className={styles.stateRight}>
        <div className={styles.mapFrame}>
          <ExploreLeafletMap markers={[]} />
        </div>
      </div>
    </div>
  );

  return (
    <AppContent variant="map" className={styles.page}>
      <FilmGrainOverlay />

      {toastMessage ? (
        <div className={styles.toast}>
          <span className="material-symbols-outlined">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      ) : null}

      <div className={styles.shell}>
        {viewState === "loading" && filteredPlaces.length === 0 ? renderLoadingState() : null}
        {viewState === "empty" ? renderEmptyState() : null}
        {viewState === "error" ? renderErrorState() : null}

        {viewState === "default" || (viewState === "loading" && filteredPlaces.length > 0) ? (
          <div className={styles.splitLayout}>
            <aside className={styles.leftColumn}>
              <Card variant="ticket" className={styles.headerCard}>
                <div className={styles.headerRow}>
                  <KineticTitle text="Khám phá địa điểm" size="card" variant="pop" />
                  <Badge variant="sticker" icon="explore">
                    Toàn quốc
                  </Badge>
                </div>
                <p className={styles.headerText}>
                  Tìm địa danh, ăn uống và vui chơi trên khắp cả nước.
                </p>
              </Card>


              {/* --- Active Filter Chips --- */}
              {(appliedProvinceQuery || appliedCityQuery || activeGroup !== "ALL" || searchQuery) && (
                <div style={{
                  display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px", alignItems: "center"
                }}>
                  {appliedProvinceQuery && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "6px 12px", borderRadius: "20px",
                      background: "#eff6ff", border: "1.5px solid #bfdbfe",
                      fontSize: 12, fontWeight: 600, color: "#1e40af"
                    }}>
                      {appliedProvinceQuery === "Ho Chi Minh" ? "TP. HCM" : appliedProvinceQuery === "Khanh Hoa" ? "Khánh Hòa" : appliedProvinceQuery === "Da Nang" ? "Đà Nẵng" : appliedProvinceQuery === "Ha Noi" ? "Hà Nội" : appliedProvinceQuery}
                      <button type="button" onClick={() => { setProvinceQuery(""); setCityQuery(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
                        ×
                      </button>
                    </span>
                  )}
                  {appliedCityQuery && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "6px 12px", borderRadius: "20px",
                      background: "#f0fdf4", border: "1.5px solid #bbf7d0",
                      fontSize: 12, fontWeight: 600, color: "#166534"
                    }}>
                      {appliedCityQuery}
                      <button type="button" onClick={() => setCityQuery("")}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
                        ×
                      </button>
                    </span>
                  )}
                  {activeGroup !== "ALL" && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "6px 12px", borderRadius: "20px",
                      background: "#fefce8", border: "1.5px solid #fef08a",
                      fontSize: 12, fontWeight: 600, color: "#854d0e"
                    }}>
                      {placeGroupMeta[activeGroup]?.label || activeGroup}
                      <button type="button" onClick={() => handleGroupSelect("ALL")}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
                        ×
                      </button>
                    </span>
                  )}
                  {searchQuery && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "6px 12px", borderRadius: "20px",
                      background: "#faf5ff", border: "1.5px solid #e9d5ff",
                      fontSize: 12, fontWeight: 600, color: "#6b21a8"
                    }}>
                      &quot;{searchQuery}&quot;
                      <button type="button" onClick={() => setSearchQuery("")}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}

              <Card variant="ticket" className={styles.searchCard}>
                <div className={styles.searchRow}>
                  <div className={styles.searchInputWrap}>
                    <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                      placeholder="Tìm tên địa điểm..."
                      aria-label="Tìm kiếm địa điểm"
                      className={styles.searchInput}
                    />
                    {searchQuery ? (
                      <button type="button" onClick={() => { setSearchQuery(""); }} className={styles.clearSearch}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    ) : null}
                  </div>
                  <button type="button" onClick={handleSearch} className={styles.searchButton} aria-label="Tìm kiếm">
                    <span className="material-symbols-outlined">search</span>
                  </button>
                </div>

                <div className={styles.filterRow}>
                  <LocationSelector
                    province={appliedProvinceQuery}
                    city={appliedCityQuery}
                    onProvinceChange={(p) => setProvinceQuery(p)}
                    onCityChange={(c) => setCityQuery(c)}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: 10 }}>
                  <div style={{ flex: 1 }}>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className={styles.sortSelect}
                      aria-label="Sắp xếp"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {(activeGroup !== "ALL" || searchQuery || appliedProvinceQuery || appliedCityQuery) ? (
                    <button type="button" onClick={resetFilters} className={styles.clearFilters}
                      style={{ padding: "8px 16px", whiteSpace: "nowrap" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>filter_alt_off</span>
                      Xóa bộ lọc
                    </button>
                  ) : null}
                </div>
              </Card>

              <div className={styles.categoryRow}>
                {placeGroups.map((group) => {
                  const meta = placeGroupMeta[group];
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => handleGroupSelect(group)}
                      className={`${styles.categoryChip} ${activeGroup === group ? styles.categoryChipActive : ""}`}
                    >
                      <span className="material-symbols-outlined">{meta.icon}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.filterSummary}>
                <span className={styles.resultCount} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                  {totalElements > 0
                    ? (
                      <>
                        <strong style={{ fontSize: 16 }}>{totalElements.toLocaleString("vi-VN")}</strong> địa điểm
                        {appliedProvinceQuery && (
                          <span style={{ color: "#1e40af", fontWeight: 600, marginLeft: 4 }}>
                            tại {appliedProvinceQuery === "Ho Chi Minh" ? "TP. Hồ Chí Minh" : appliedProvinceQuery === "Khanh Hoa" ? "Khánh Hòa" : appliedProvinceQuery === "Da Nang" ? "Đà Nẵng" : appliedProvinceQuery === "Ha Noi" ? "Hà Nội" : appliedProvinceQuery}
                          </span>
                        )}
                        {appliedCityQuery && (
                          <span style={{ color: "#166534", fontWeight: 600, marginLeft: 4 }}>, {appliedCityQuery}</span>
                        )}
                        {!appliedProvinceQuery && !appliedCityQuery && (
                          <span style={{ color: "#6b7280", marginLeft: 4 }}>trên toàn quốc</span>
                        )}
                      </>
                    )
                    : "Đang tải..."}
                </span>
              </div>

              <div className={styles.placeList}>
                {filteredPlaces.length === 0 && viewState === "loading" ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="card" />
                  ))
                ) : (
                  filteredPlaces.map((place) => {
                    const isSelected = selectedPlaceId === place.id;
                    const isSaved = savedPlaceIds.includes(place.id);
                    const isMenuOpen = addToTripMenuOpen === place.id;
                    const meta = categoryMeta[place.category];
                    const verified = place.verificationStatus === "VERIFIED" || place.verificationStatus === "AUTO_APPROVED";

                    return (
                      <div
                        key={place.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handlePlaceSelect(place.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handlePlaceSelect(place.id);
                          }
                        }}
                        className={`${styles.placeCard} ${isSelected ? styles.placeCardSelected : ""}`}
                      >
                        <div className={styles.placeThumb}>
                          <RetroImage
                            src={place.imageUrl}
                            alt={place.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          {verified ? (
                            <span className={styles.verifiedBadge}>
                              <span className="material-symbols-outlined">verified</span>
                            </span>
                          ) : null}
                        </div>

                        <div className={styles.placeBody}>
                          <div className={styles.placeTop}>
                            <div className={styles.placeTitleBlock}>
                              <h3 className={styles.placeTitle}>{place.name}</h3>
                              <button
                                type="button"
                                onClick={(event) => handleSaveToggle(place.id, event)}
                                className={styles.favoriteButton}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{
                                    fontVariationSettings: isSaved
                                      ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 20"
                                      : "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20",
                                  }}
                                >
                                  favorite
                                </span>
                              </button>
                            </div>

                            <div className={styles.placeMeta}>
                              <Badge variant={meta.badge} size="sm" icon={meta.icon}>
                                {meta.label}
                              </Badge>
                              {place.province ? (
                                <span className={styles.placeMetaText}>
                                  <span className="material-symbols-outlined">location_on</span>
                                  {place.province}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className={styles.placeRatingRow}>
                            {place.rating > 0 ? (
                              <span className={styles.ratingBadge}>
                                <span className="material-symbols-outlined">star</span>
                                {place.rating.toFixed(1)}
                              </span>
                            ) : null}
                            {place.durationLabel ? (
                              <span className={styles.placeMetaText}>
                                <span className="material-symbols-outlined">schedule</span>
                                {place.durationLabel}
                              </span>
                            ) : null}
                          </div>

                          <div className={styles.tagRow}>
                            {place.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className={styles.tagChip}>#{tag}</span>
                            ))}
                            {place.tags.length > 3 ? (
                              <span className={styles.tagChip}>+{place.tags.length - 3}</span>
                            ) : null}
                          </div>

                          <div className={styles.placeActions}>
                            <div className={styles.inlineActions}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setAddToTripMenuOpen(isMenuOpen ? null : place.id);
                                }}
                                className={`${styles.smallAction} ${styles.smallActionPrimary}`}
                              >
                                <span className="material-symbols-outlined">add_circle</span>
                                Thêm vào trip
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedPlaceId(place.id);
                                  setDetailDrawerOpen(true);
                                }}
                                className={styles.smallAction}
                              >
                                <span className="material-symbols-outlined">info</span>
                                Chi tiết
                              </button>
                            </div>
                            {place.costLabel ? (
                              <div className={styles.costLabel}>
                                <span className="material-symbols-outlined">payments</span>
                                {place.costLabel}
                              </div>
                            ) : null}

                            {isMenuOpen ? (
                              <div className={styles.tripMenu}>
                                <div className={styles.tripMenuHeader}>Chọn trip</div>
                                <button
                                  type="button"
                                  className={styles.tripMenuItem}
                                  onClick={() => {
                                    setToastMessage(`Đã thêm "${place.name}" vào trip.`);
                                    setAddToTripMenuOpen(null);
                                  }}
                                >
                                  + Tạo trip mới
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {totalPages > 1 ? (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => handlePageChange(page - 1)}
                    className={styles.pageButton}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span className={styles.pageInfo}>
                    Trang {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => handlePageChange(page + 1)}
                    className={styles.pageButton}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              ) : null}
            </aside>

            <main className={styles.rightColumn}>
              <div className={styles.mapFrame}>
                <ExploreLeafletMap
                  markers={safeMarkers}
                  onMarkerClick={handleMarkerClick}
                  onViewportChange={handleViewportChange}
                  center={mapCenter}
                  selectedMarkerId={selectedPlaceId}
                  fitBoundsKey={`${activeGroup}|${appliedProvinceQuery}|${appliedCityQuery}|${searchQuery}|${page}`}
                />

                <Card variant="mapOverlay" className={styles.mapCountOverlay}>
                  <div className={styles.mapCountContent}>
                    <span className="material-symbols-outlined">travel_explore</span>
                    <span>{mapMarkers.length} điểm</span>
                    {provinceQuery || cityQuery ? (
                      <>
                        <span className={styles.mapCountDot}>•</span>
                        <span>{[provinceQuery, cityQuery].filter(Boolean).join(" · ")}</span>
                      </>
                    ) : null}
                  </div>
                </Card>

                {selectedPlaceId && activePlaceObj && !detailDrawerOpen ? (
                  <Card variant="speech" className={styles.mapBubble}>
                    <div className={styles.mapBubbleHeader}>
                      <div>
                        <h4 className={styles.mapBubbleTitle}>{activePlaceObj.name}</h4>
                        <p className={styles.mapBubbleSubtitle}>
                          {[activePlaceObj.province, activePlaceObj.city].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPlaceId(null)}
                        className={styles.mapBubbleClose}
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className={styles.mapBubbleMeta}>
                      <span>
                        <span className="material-symbols-outlined">schedule</span>
                        {activePlaceObj.durationLabel}
                      </span>
                      {activePlaceObj.rating > 0 ? (
                        <span>
                          <span className="material-symbols-outlined">star</span>
                          {activePlaceObj.rating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.mapBubbleActions}>
                      <button
                        type="button"
                        onClick={() => handleSaveToggle(activePlaceObj.id)}
                        className={styles.overlayAction}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontVariationSettings: savedPlaceIds.includes(activePlaceObj.id)
                              ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 20"
                              : "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20",
                          }}
                        >
                          favorite
                        </span>
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddToTripMenuOpen(activePlaceObj.id)}
                        className={`${styles.overlayAction} ${styles.overlayActionPrimary}`}
                      >
                        <span className="material-symbols-outlined">add_circle</span>
                        Thêm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailDrawerOpen(true)}
                        className={`${styles.overlayAction} ${styles.overlayActionInfo}`}
                      >
                        <span className="material-symbols-outlined">visibility</span>
                        Xem
                      </button>
                    </div>
                  </Card>
                ) : null}

                <div className={styles.mapControls}>
                  {["add", "remove", "my_location", "zoom_out_map"].map((icon) => (
                    <button key={icon} type="button" className={styles.mapControlButton}>
                      <span className="material-symbols-outlined">{icon}</span>
                    </button>
                  ))}
                </div>

                {detailDrawerOpen && activePlaceObj ? (
                  <div className={styles.drawer}>
                    <div className={styles.drawerHero}>
                      <RetroImage
                        src={activePlaceObj.imageUrl}
                        alt={activePlaceObj.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        type="button"
                        onClick={() => setDetailDrawerOpen(false)}
                        className={styles.drawerClose}
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className={styles.drawerContent}>
                      <div className={styles.drawerHeading}>
                        <Badge
                          variant={categoryMeta[activePlaceObj.category].badge}
                          size="sm"
                          icon={categoryMeta[activePlaceObj.category].icon}
                        >
                          {categoryMeta[activePlaceObj.category].label}
                        </Badge>
                        <h3 className={styles.drawerTitle}>{activePlaceObj.name}</h3>
                        <p className={styles.drawerSubtitle}>
                          {[activePlaceObj.province, activePlaceObj.city].filter(Boolean).join(", ")}
                        </p>
                      </div>

                      <div className={styles.drawerStats}>
                        <div className={styles.drawerStatRow}>
                          <span>
                            <span className="material-symbols-outlined">star</span>
                            Danh gia
                          </span>
                          <strong>{activePlaceObj.rating > 0 ? `${activePlaceObj.rating.toFixed(1)} / 5` : "Chưa có"}</strong>
                        </div>
                        <div className={styles.drawerStatRow}>
                          <span>
                            <span className="material-symbols-outlined">schedule</span>
                            Thoi gian tham quan
                          </span>
                          <strong>{activePlaceObj.durationLabel}</strong>
                        </div>
                        {activePlaceObj.costLabel ? (
                          <div className={styles.drawerStatRow}>
                            <span>
                              <span className="material-symbols-outlined">payments</span>
                              Gia du kien
                            </span>
                            <strong>{activePlaceObj.costLabel}</strong>
                          </div>
                        ) : null}
                      </div>

                      {activePlaceObj.description ? (
                        <div className={styles.drawerSection}>
                          <h4>Gioi thieu</h4>
                          <p>{activePlaceObj.description}</p>
                        </div>
                      ) : null}

                      <div className={styles.drawerTagList}>
                        {activePlaceObj.tags.map((tag) => (
                          <Badge key={tag} variant="neutral" size="sm">#{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className={styles.drawerFooter}>
                      <Button
                        variant="secondary"
                        size="md"
                        style={{ flex: 1 }}
                        onClick={() => handleSaveToggle(activePlaceObj.id)}
                      >
                        {savedPlaceIds.includes(activePlaceObj.id) ? "Đã lưu" : "Lưu"}
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        style={{ flex: 1.3 }}
                        onClick={() => setAddToTripMenuOpen(activePlaceObj.id)}
                      >
                        Thêm vào trip
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </main>
          </div>
        ) : null}
      </div>
    </AppContent>
  );
};