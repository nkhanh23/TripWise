"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AppContent } from "@/components/layout/AppContent";
import { FilmGrainOverlay } from "@/components/motion/FilmGrainOverlay";
import { KineticTitle } from "@/components/motion/KineticTitle";
import { Badge } from "@/components/ui/Badge";
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
type ActiveLocationField = "province" | "city" | null;

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

const placeGroups: ExplorePlaceGroup[] = ["ATTRACTION", "FOOD", "HOTEL"];

const placeGroupMeta: Record<
  ExplorePlaceGroup,
  { label: string; icon: string; description: string }
> = {
  ATTRACTION: {
    label: "Dia diem du lich",
    icon: "explore",
    description: "Chi hien thi cac dia diem tham quan da duoc loc sach.",
  },
  FOOD: {
    label: "An uong",
    icon: "restaurant",
    description: "Kham pha quan an, cafe va bar phu hop cho chuyen di.",
  },
  HOTEL: {
    label: "Khach san",
    icon: "hotel",
    description: "Tim khach san va noi luu tru phu hop theo khu vuc.",
  },
};

const SORT_OPTIONS = [
  { value: "popularityScore_desc", label: "Phổ biến" },
  { value: "rating_desc", label: "Đánh giá cao" },
  { value: "name_asc", label: "Tên A-Z" },
  { value: "name_desc", label: "Tên Z-A" },
] as const;

const VIETNAM_PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh",
  "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau",
  "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai",
  "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương",
  "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hồ Chí Minh", "Hưng Yên", "Khánh Hòa",
  "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An",
  "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
  "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế",
  "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
] as const;

const VIETNAM_CITIES = [
  "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Nha Trang",
  "Đà Lạt", "Hội An", "Huế", "Phan Thiết", "Vũng Tàu", "Quy Nhơn", "Hạ Long",
  "Phú Quốc", "Sa Pa", "Tuy Hòa", "Buôn Ma Thuột", "Pleiku", "Biên Hòa", "Thủ Dầu Một",
  "Ninh Bình", "Tam Đảo", "Móng Cái", "Việt Trì", "Thái Bình", "Nam Định", "Thanh Hóa",
  "Vinh", "Đồng Hới", "Đông Hà", "Quảng Ngãi", "Tam Kỳ", "Rạch Giá", "Hà Tiên",
  "Long Xuyên", "Châu Đốc", "Mỹ Tho", "Bến Tre", "Cà Mau", "Sóc Trăng", "Trà Vinh",
  "Vĩnh Long", "Cao Lãnh", "Sa Đéc", "Bạc Liêu", "Dĩ An", "Thuận An",
] as const;

const CITY_OPTIONS_BY_PROVINCE: Record<string, string[]> = {
  "Hà Nội": ["Hà Nội"],
  "Hồ Chí Minh": ["Hồ Chí Minh", "Dĩ An", "Thuận An"],
  "Đà Nẵng": ["Đà Nẵng"],
  "Hải Phòng": ["Hải Phòng"],
  "Cần Thơ": ["Cần Thơ"],
  "Khánh Hòa": ["Nha Trang"],
  "Lâm Đồng": ["Đà Lạt"],
  "Quảng Nam": ["Hội An", "Tam Kỳ"],
  "Thừa Thiên Huế": ["Huế"],
  "Bình Thuận": ["Phan Thiết"],
  "Bà Rịa - Vũng Tàu": ["Vũng Tàu"],
  "Bình Định": ["Quy Nhơn"],
  "Quảng Ninh": ["Hạ Long", "Móng Cái"],
  "Kiên Giang": ["Phú Quốc", "Rạch Giá", "Hà Tiên"],
  "Lào Cai": ["Sa Pa"],
  "Phú Yên": ["Tuy Hòa"],
  "Đắk Lắk": ["Buôn Ma Thuột"],
  "Gia Lai": ["Pleiku"],
  "Đồng Nai": ["Biên Hòa"],
  "Bình Dương": ["Thủ Dầu Một", "Dĩ An", "Thuận An"],
  "Ninh Bình": ["Ninh Bình", "Tam Đảo"],
  "Phú Thọ": ["Việt Trì"],
  "Thái Bình": ["Thái Bình"],
  "Nam Định": ["Nam Định"],
  "Thanh Hóa": ["Thanh Hóa"],
  "Nghệ An": ["Vinh"],
  "Quảng Bình": ["Đồng Hới"],
  "Quảng Trị": ["Đông Hà"],
  "Quảng Ngãi": ["Quảng Ngãi"],
  "An Giang": ["Long Xuyên", "Châu Đốc"],
  "Tiền Giang": ["Mỹ Tho"],
  "Bến Tre": ["Bến Tre"],
  "Cà Mau": ["Cà Mau"],
  "Sóc Trăng": ["Sóc Trăng"],
  "Trà Vinh": ["Trà Vinh"],
  "Vĩnh Long": ["Vĩnh Long"],
  "Đồng Tháp": ["Cao Lãnh", "Sa Đéc"],
  "Bạc Liêu": ["Bạc Liêu"],
};

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
  const [activeLocationField, setActiveLocationField] = useState<ActiveLocationField>(null);
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
  const locationComboboxRef = useRef<HTMLDivElement | null>(null);

  const appliedProvinceQuery = provinceQuery.trim();
  const appliedCityQuery = cityQuery.trim();
  const locationViewportPreset = useMemo(
    () => resolveLocationViewport({
      province: appliedProvinceQuery,
      city: appliedCityQuery,
    }),
    [appliedProvinceQuery, appliedCityQuery],
  );

  const filteredProvinceOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(provinceQuery);
    if (!normalizedQuery) {
      return [...VIETNAM_PROVINCES].slice(0, 12);
    }

    return VIETNAM_PROVINCES
      .filter((option) => normalizeSearchValue(option).includes(normalizedQuery))
      .slice(0, 12);
  }, [provinceQuery]);

  const cityOptions = useMemo(() => {
    const provinceCities = CITY_OPTIONS_BY_PROVINCE[appliedProvinceQuery];
    return provinceCities && provinceCities.length > 0 ? provinceCities : [...VIETNAM_CITIES];
  }, [appliedProvinceQuery]);

  const filteredCityOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(cityQuery);
    if (!normalizedQuery) {
      return cityOptions.slice(0, 12);
    }

    return cityOptions
      .filter((option) => normalizeSearchValue(option).includes(normalizedQuery))
      .slice(0, 12);
  }, [cityOptions, cityQuery]);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (!locationComboboxRef.current) return;
      if (locationComboboxRef.current.contains(event.target as Node)) return;
      setActiveLocationField(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      const visibleMarkers = filterMarkersByVisiblePlaces(
        markers,
        mappedPlaces.map((place) => place.id),
      );
      setMapMarkers(toExploreMarkers(visibleMarkers));
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
    void triggerSearch(0);
  }, [triggerSearch]);

  useEffect(() => {
    scheduleDebouncedSearch(0);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [provinceQuery, cityQuery, searchQuery, activeGroup, sortOption, scheduleDebouncedSearch]);

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
    setActiveGroup(DEFAULT_EXPLORE_PLACE_GROUP);
    setSearchQuery("");
    setProvinceQuery("");
    setCityQuery("");
    setActiveLocationField(null);
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
                      className={styles.searchInput}
                    />
                    {searchQuery ? (
                      <button type="button" onClick={() => { setSearchQuery(""); }} className={styles.clearSearch}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    ) : null}
                  </div>
                  <button type="button" onClick={handleSearch} className={styles.searchButton}>
                    <span className="material-symbols-outlined">search</span>
                  </button>
                </div>

                <div className={styles.filterRow} ref={locationComboboxRef}>
                  <div className={styles.locationCombobox}>
                    <div className={styles.filterInputWrap}>
                      <span className={`material-symbols-outlined ${styles.filterIcon}`}>location_city</span>
                      <input
                        type="text"
                        value={provinceQuery}
                        onChange={(e) => {
                          setProvinceQuery(e.target.value);
                          setActiveLocationField("province");
                          if (cityQuery && CITY_OPTIONS_BY_PROVINCE[e.target.value.trim()]?.includes(cityQuery) !== true) {
                            setCityQuery("");
                          }
                        }}
                        onFocus={() => setActiveLocationField("province")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (filteredProvinceOptions.length > 0) {
                              setProvinceQuery(filteredProvinceOptions[0]);
                            }
                            setActiveLocationField(null);
                            handleSearch();
                          }
                          if (e.key === "Escape") {
                            setActiveLocationField(null);
                          }
                        }}
                        placeholder="Tìm tỉnh..."
                        className={styles.filterInput}
                      />
                      {provinceQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProvinceQuery("");
                            setCityQuery("");
                            setActiveLocationField("province");
                          }}
                          className={styles.clearLocation}
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      ) : null}
                    </div>

                    {activeLocationField === "province" ? (
                      <div className={styles.locationDropdown}>
                        {filteredProvinceOptions.length > 0 ? (
                          filteredProvinceOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setProvinceQuery(option);
                                if (cityQuery && CITY_OPTIONS_BY_PROVINCE[option]?.includes(cityQuery) !== true) {
                                  setCityQuery("");
                                }
                                setActiveLocationField(null);
                              }}
                              className={styles.locationOption}
                            >
                              {option}
                            </button>
                          ))
                        ) : (
                          <div className={styles.locationOption}>Không tìm thấy tỉnh phù hợp</div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.locationCombobox}>
                    <div className={styles.filterInputWrap}>
                      <span className={`material-symbols-outlined ${styles.filterIcon}`}>apartment</span>
                      <input
                        type="text"
                        value={cityQuery}
                        onChange={(e) => {
                          setCityQuery(e.target.value);
                          setActiveLocationField("city");
                        }}
                        onFocus={() => setActiveLocationField("city")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (filteredCityOptions.length > 0) {
                              setCityQuery(filteredCityOptions[0]);
                            }
                            setActiveLocationField(null);
                            handleSearch();
                          }
                          if (e.key === "Escape") {
                            setActiveLocationField(null);
                          }
                        }}
                        placeholder={provinceQuery ? `Tìm thành phố trong ${provinceQuery}...` : "Tìm thành phố..."}
                        className={styles.filterInput}
                      />
                      {cityQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCityQuery("");
                            setActiveLocationField("city");
                          }}
                          className={styles.clearLocation}
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      ) : null}
                    </div>

                    {activeLocationField === "city" ? (
                      <div className={styles.locationDropdown}>
                        {filteredCityOptions.length > 0 ? (
                          filteredCityOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setCityQuery(option);
                                setActiveLocationField(null);
                              }}
                              className={styles.locationOption}
                            >
                              {option}
                            </button>
                          ))
                        ) : (
                          <div className={styles.locationOption}>
                            {provinceQuery ? "Không có thành phố phù hợp trong tỉnh đã chọn" : "Không tìm thấy thành phố phù hợp"}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className={styles.sortSelect}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
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
                <span className={styles.resultCount}>
                  {totalElements > 0
                    ? `Tìm thấy ${totalElements} địa điểm`
                    : "Đang tải..."}
                </span>
                {activeGroup !== "ATTRACTION" || searchQuery || provinceQuery || cityQuery ? (
                  <button type="button" onClick={resetFilters} className={styles.clearFilters}>
                    Xóa bộ lọc
                  </button>
                ) : null}
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
