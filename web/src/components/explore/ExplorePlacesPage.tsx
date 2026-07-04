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
import { searchPlaces, getPlaceMapMarkers, getPlaceDetail } from "@/lib/api";
import type { PlaceResponse, PageResponse, PlaceMapMarkerResponse } from "@/lib/api/contracts";
import type { MapMarkerData } from "./ExploreLeafletMap";
import styles from "./ExplorePlacesPage.module.css";

const ExploreLeafletMap = dynamic(() => import("./ExploreLeafletMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <span className="material-symbols-outlined">map</span>
      <span>Dang tai ban do...</span>
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

const categories: ExploreCategory[] = [
  "Tat ca",
  "Bien",
  "Van hoa",
  "An uong",
  "Cafe",
  "Check-in",
  "Mua sam",
  "Thien nhien",
];

const categoryMeta: Record<
  ExploreCategory,
  { label: string; icon: string; badge: "info" | "success" | "warn" | "neutral" }
> = {
  "Tat ca": { label: "Tat ca", icon: "apps", badge: "neutral" },
  Bien: { label: "Bien", icon: "water", badge: "info" },
  "Van hoa": { label: "Van hoa", icon: "temple_hindu", badge: "warn" },
  "An uong": { label: "An uong", icon: "restaurant", badge: "warn" },
  Cafe: { label: "Cafe", icon: "local_cafe", badge: "neutral" },
  "Check-in": { label: "Check-in", icon: "photo_camera", badge: "success" },
  "Mua sam": { label: "Mua sam", icon: "shopping_bag", badge: "warn" },
  "Thien nhien": { label: "Thien nhien", icon: "park", badge: "success" },
  Khac: { label: "Khac", icon: "place", badge: "neutral" },
};

const SORT_OPTIONS = [
  { value: "popularityScore_desc", label: "Pho bien" },
  { value: "rating_desc", label: "Danh gia cao" },
  { value: "name_asc", label: "Ten A-Z" },
  { value: "name_desc", label: "Ten Z-A" },
] as const;

const PAGE_SIZE = 20;
const MAP_MARKER_LIMIT = 200;

function normalizeCategory(value?: string): ExploreCategory {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

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
    durationLabel: place.durationMinutes ? `${place.durationMinutes} phut` : "30 phut",
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
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>("Tat ca");
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceQuery, setProvinceQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("popularityScore_desc");
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [addToTripMenuOpen, setAddToTripMenuOpen] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [places, setPlaces] = useState<ExplorePlaceData[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [mapMarkers, setMapMarkers] = useState<MapMarkerData[]>([]);
  const hasSelectedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const loadPlaces = useCallback(async (pageNum: number) => {
    setViewState("loading");

    try {
      const { sortBy, sortDirection } = parseSortOption(sortOption);

      const response: PageResponse<PlaceResponse> = await searchPlaces({
        province: provinceQuery || undefined,
        keyword: searchQuery || undefined,
        categoryId: activeCategory === "Tat ca" ? undefined : undefined,
        sortBy,
        sortDirection,
        page: pageNum,
        size: PAGE_SIZE,
      });

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
    } catch {
      setViewState("error");
    }
  }, [provinceQuery, searchQuery, activeCategory, sortOption]);

  const loadMapMarkers = useCallback(async () => {
    try {
      const markers = await getPlaceMapMarkers({
        minLat: -90,
        minLng: -180,
        maxLat: 90,
        maxLng: 180,
        province: provinceQuery || undefined,
        categoryId: activeCategory === "Tat ca" ? undefined : undefined,
        limit: MAP_MARKER_LIMIT,
      });
      setMapMarkers(toExploreMarkers(markers));
    } catch {
      setMapMarkers([]);
    }
  }, [provinceQuery, activeCategory]);

  const triggerSearch = useCallback((pageNum: number) => {
    setPage(pageNum);
    setSelectedPlaceId(null);
    hasSelectedRef.current = false;
    void loadPlaces(pageNum);
    void loadMapMarkers();
  }, [loadPlaces, loadMapMarkers]);

  const scheduleDebouncedSearch = useCallback((pageNum: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      triggerSearch(pageNum);
    }, 400);
  }, [triggerSearch]);

  useEffect(() => {
    void loadPlaces(0);
    void loadMapMarkers();
  }, [loadPlaces, loadMapMarkers]);

  useEffect(() => {
    scheduleDebouncedSearch(0);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [provinceQuery, searchQuery, activeCategory, sortOption, scheduleDebouncedSearch]);

  const handleSearch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    triggerSearch(0);
  }, [triggerSearch]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    void loadPlaces(newPage);
  }, [loadPlaces, totalPages]);

  const handleCategorySelect = useCallback((category: ExploreCategory) => {
    setActiveCategory(category);
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
        setToastMessage("Da bo luu dia diem nay.");
        return prev.filter((pid) => pid !== id);
      }
      setToastMessage("Da them vao danh sach yeu thich.");
      return [...prev, id];
    });
  }, []);

  const handleMarkerClick = useCallback((markerId: string) => {
    setSelectedPlaceId(markerId);
    setDetailDrawerOpen(false);
  }, []);

  const resetFilters = useCallback(() => {
    setActiveCategory("Tat ca");
    setSearchQuery("");
    setProvinceQuery("");
    setSortOption("popularityScore_desc");
    setPage(0);
    setSelectedPlaceId(null);
    hasSelectedRef.current = false;
  }, []);

  const filteredPlaces = useMemo(() => {
    if (activeCategory === "Tat ca") return places;
    return places.filter((p) => p.category === activeCategory);
  }, [places, activeCategory]);

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
            title="Khong tim thay dia diem"
            message="Khong co dia danh nao khop voi bo loc hien tai."
            actions={<Button onClick={resetFilters}>Xoa bo loc</Button>}
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
        <Card title="Da co loi xay ra">
          <ErrorBanner
            message="Khong the tai duoc danh sach dia diem tu he thong."
            onRetry={() => { setPage(0); void loadPlaces(0); }}
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

        {viewState !== "loading" || filteredPlaces.length > 0 ? (
          <div className={styles.splitLayout}>
            <aside className={styles.leftColumn}>
              <Card variant="ticket" className={styles.headerCard}>
                <div className={styles.headerRow}>
                  <KineticTitle text="Kham pha dia diem" size="card" variant="pop" />
                  <Badge variant="sticker" icon="explore">
                    Toan quoc
                  </Badge>
                </div>
                <p className={styles.headerText}>
                  Tim dia danh, an uong va vui choi tren khap ca nuoc.
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
                      placeholder="Tim ten dia diem..."
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

                <div className={styles.filterRow}>
                  <div className={styles.filterInputWrap}>
                    <span className={`material-symbols-outlined ${styles.filterIcon}`}>location_city</span>
                    <input
                      type="text"
                      value={provinceQuery}
                      onChange={(e) => setProvinceQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                      placeholder="Tinh/Thanh pho..."
                      className={styles.filterInput}
                    />
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
                {categories.map((category) => {
                  const meta = categoryMeta[category];
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`${styles.categoryChip} ${activeCategory === category ? styles.categoryChipActive : ""}`}
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
                    ? `Tim thay ${totalElements} dia diem`
                    : "Dang tai..."}
                </span>
                {activeCategory !== "Tat ca" || searchQuery || provinceQuery ? (
                  <button type="button" onClick={resetFilters} className={styles.clearFilters}>
                    Xoa bo loc
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
                    const verified = place.verificationStatus === "VERIFIED" || place.verificationStatus === "PARTIALLY_VERIFIED";

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
                                Them vao trip
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
                                Chi tiet
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
                                <div className={styles.tripMenuHeader}>Chon trip</div>
                                <button
                                  type="button"
                                  className={styles.tripMenuItem}
                                  onClick={() => {
                                    setToastMessage(`Da them "${place.name}" vao trip.`);
                                    setAddToTripMenuOpen(null);
                                  }}
                                >
                                  + Tao trip moi
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
                  selectedMarkerId={selectedPlaceId}
                />

                <Card variant="mapOverlay" className={styles.mapCountOverlay}>
                  <div className={styles.mapCountContent}>
                    <span className="material-symbols-outlined">travel_explore</span>
                    <span>{mapMarkers.length} markers</span>
                    {provinceQuery ? (
                      <>
                        <span className={styles.mapCountDot}>•</span>
                        <span>{provinceQuery}</span>
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
                        Luu
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddToTripMenuOpen(activePlaceObj.id)}
                        className={`${styles.overlayAction} ${styles.overlayActionPrimary}`}
                      >
                        <span className="material-symbols-outlined">add_circle</span>
                        Them
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
                          <strong>{activePlaceObj.rating > 0 ? `${activePlaceObj.rating.toFixed(1)} / 5` : "Chua co"}</strong>
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
                        {savedPlaceIds.includes(activePlaceObj.id) ? "Da luu" : "Luu"}
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        style={{ flex: 1.3 }}
                        onClick={() => setAddToTripMenuOpen(activePlaceObj.id)}
                      >
                        Them vao trip
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