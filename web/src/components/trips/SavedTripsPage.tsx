"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./SavedTripsPage.module.css";
import { AppContent } from "@/components/layout/AppContent";
import { Button, Card, EmptyState, ErrorMessage, Loading, Badge } from "@/components/ui";
import { KineticTitle, BounceCard, FilmGrainOverlay } from "@/components/motion";
import {
  ApiError,
  AuthSessionExpiredError,
  deleteTrip,
  listTrips,
  type PageResponse,
  type TripResponse
} from "@/lib/api";

const PAGE_SIZE = 6;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  GENERATED: "Đã tạo",
  PLANNED: "Sắp tới",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ"
};

const STATUS_FILTERS = [
  { key: "ALL", label: "Tất cả" },
  { key: "DRAFT", label: "Nháp" },
  { key: "GENERATED", label: "Đã tạo" },
  { key: "PLANNED", label: "Sắp tới" },
  { key: "COMPLETED", label: "Hoàn tất" }
] as const;

function formatDate(value?: string) {
  if (!value) {
    return "Chưa rõ";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDuration(trip: TripResponse) {
  if (trip.days && trip.nights !== undefined) {
    return `${trip.days}N${trip.nights}Đ`;
  }

  if (trip.days) {
    return `${trip.days} ngày`;
  }

  if (trip.startDate) {
    return formatDate(trip.startDate);
  }

  return "—";
}

function buildTripTitle(trip: TripResponse) {
  const base = trip.destination || "Chuyến đi tự do";
  const icon = trip.status === "COMPLETED" ? "🏮" : trip.status === "PLANNED" ? "☁️" : "🏖️";

  if (!trip.days) {
    return `${base} ${icon}`;
  }

  return `${base} Hè Rực Rỡ ${icon}`;
}

function getEndDateStr(startDate?: string, days?: number) {
  if (!startDate) return "";
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";
  if (!days) return formatDate(startDate);
  
  const end = new Date(start.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
  return formatDate(end.toISOString().split('T')[0]);
}

function normalizeError(error: unknown) {
  if (error instanceof AuthSessionExpiredError) {
    return "Phiên đăng nhập đã hết hạn. Bạn hãy đăng nhập lại để xem các trip đã lưu.";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Không thể kết nối đến máy chủ lưu trữ thư viện chuyến đi.";
}

function getTripHeaderGradient(tripId: number) {
  const gradients = [
    'linear-gradient(135deg, #FFD166 0%, #F77F00 100%)',
    'linear-gradient(135deg, #B8F24A 0%, #20A7D8 100%)',
    'linear-gradient(135deg, #20A7D8 0%, #FFD166 100%)',
    'linear-gradient(135deg, #F77F00 0%, #E6392E 100%)',
  ];
  return gradients[tripId % gradients.length];
}

export function SavedTripsPage() {
  const router = useRouter();
  const [tripPage, setTripPage] = useState<PageResponse<TripResponse> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "date" | "cost">("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage(null);
    listTrips(currentPage, PAGE_SIZE)
      .then((response) => {
        if (active) {
          setTripPage(response);
        }
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(normalizeError(error));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [currentPage, statusFilter, refreshKey]);

  // Statistics calculated from current returned elements/metadata
  const stats = useMemo(() => {
    const list = tripPage?.content ?? [];
    return {
      total: tripPage?.totalElements ?? 0,
      draft: list.filter((t) => t.status === "DRAFT").length,
      planned: list.filter((t) => t.status === "PLANNED").length,
      completed: list.filter((t) => t.status === "COMPLETED").length
    };
  }, [tripPage]);

  // Local query filter and sort processing
  const processedTrips = useMemo(() => {
    const items = [...(tripPage?.content ?? [])];
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? items.filter(
          (t) =>
            t.destination?.toLowerCase().includes(query) ||
            t.travelStyle?.toLowerCase().includes(query) ||
            t.interests?.some((i) => i.toLowerCase().includes(query))
        )
      : items;

    return filtered.sort((a, b) => {
      if (sortBy === "cost") {
        const valA = a.budget === "Thoai mai" ? 3 : a.budget === "Vua phai" ? 2 : 1;
        const valB = b.budget === "Thoai mai" ? 3 : b.budget === "Vua phai" ? 2 : 1;
        return valB - valA;
      }
      if (sortBy === "date") {
        return (a.startDate || "").localeCompare(b.startDate || "");
      }
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
  }, [tripPage, searchQuery, sortBy]);

  async function handleDeleteTrip(trip: TripResponse) {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá hành trình "${trip.destination}"?`)) {
      return;
    }

    setIsDeletingId(trip.id);
    try {
      await deleteTrip(trip.id);
      const nextPage =
        tripPage &&
        tripPage.content.length === 1 &&
        currentPage > 0
          ? currentPage - 1
          : currentPage;

      const response = await listTrips(nextPage, PAGE_SIZE);

      setCurrentPage(nextPage);
      setTripPage(response);
    } catch (error) {
      setErrorMessage(normalizeError(error));
    } finally {
      setIsDeletingId(null);
    }
  }

  function handleOpenTrip(tripId: number) {
    startTransition(() => {
      router.push(`/trips/${tripId}`);
    });
  }

  function handleOpenPlanner() {
    startTransition(() => {
      router.push("/planner");
    });
  }

  function handleRetry() {
    setRefreshKey((value) => value + 1);
  }

  return (
    <AppContent variant="standard" className={`${styles.page} px-0 pt-0 sm:px-0 lg:px-0`}>
      <FilmGrainOverlay />
      
      <div className={styles.shell}>
        
        {/* HERO CARD SUMMARY */}
        <BounceCard delay={100}>
          <div className={styles.heroCard}>
            <div className={styles.travelArchiveBadge}>
              Travel Archive
            </div>

            <div>
              <KineticTitle text="Chuyến đi đã lưu 🧳" size="section" variant="pop" />
              <p className={styles.heroDesc}>
                Tất cả các bản phác thảo nháp, hành trình sắp tới và lịch sử chuyến đi hoàn tất nằm gọn ở đây.
              </p>
            </div>

            {/* Stat Stickers */}
            <div className={styles.statsGrid}>
              <div className={styles.statSticker}>
                <div className={styles.statLabel}>Tổng Trips</div>
                <div className={styles.statValue} style={{ color: '#20A7D8' }}>{stats.total}</div>
              </div>
              <div className={styles.statSticker}>
                <div className={styles.statLabel}>Đang nháp</div>
                <div className={styles.statValue} style={{ color: '#FFD166' }}>{stats.draft}</div>
              </div>
              <div className={styles.statSticker}>
                <div className={styles.statLabel}>Sắp tới</div>
                <div className={styles.statValue} style={{ color: '#F77F00' }}>{stats.planned}</div>
              </div>
              <div className={styles.statSticker}>
                <div className={styles.statLabel}>Hoàn tất</div>
                <div className={styles.statValue} style={{ color: '#B8F24A' }}>{stats.completed}</div>
              </div>
            </div>
          </div>
        </BounceCard>

        {/* TOOLBAR FILTER LINE */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            {/* Search Input Box */}
            <div className={styles.searchWrapper}>
              <i className={`material-symbols-outlined ${styles.searchIcon}`}>search</i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên chuyến hoặc địa danh..."
                className={styles.searchInput}
              />
            </div>

            {/* Status Chips */}
            <div className={styles.statusChips}>
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter.key);
                    setCurrentPage(0);
                  }}
                  className={`${styles.statusChip} ${
                    statusFilter === filter.key ? styles.statusChipActive : ""
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Toolbar Options */}
          <div className={styles.optionsGroup}>
            
            {/* Sort Selection */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className={styles.sortLabel}>Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={styles.sortSelect}
              >
                <option value="updated">Cập nhật</option>
                <option value="date">Ngày đi</option>
                <option value="cost">Chi phí</option>
              </select>
            </div>

            {/* View Switcher */}
            <div className={styles.viewToggler}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleBtnActive : ''}`}
                aria-label="Grid view"
              >
                <i className="material-symbols-outlined" style={{ fontSize: 16 }}>grid_view</i>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleBtnActive : ''}`}
                aria-label="List view"
              >
                <i className="material-symbols-outlined" style={{ fontSize: 16 }}>view_list</i>
              </button>
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <Card className={styles.stateCard} elevated>
            <div className={styles.stateWrap}>
              <Loading label="TripWise đang tải thư viện chuyến đi đã lưu..." />
              <p className={styles.stateHint}>
                Danh sách sẽ được phân trang từ máy chủ và đồng bộ trong vài giây.
              </p>
            </div>
          </Card>
        )}

        {/* ERROR STATE */}
        {errorMessage && !isLoading && (
          <Card className={styles.stateCard} elevated>
            <ErrorMessage
              message={errorMessage}
              title="Không tải được thư viện chuyến đi"
              actions={
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button onClick={handleRetry}>Thử lại</Button>
                  <Button onClick={handleOpenPlanner} variant="secondary">Mở planner</Button>
                </div>
              }
            />
          </Card>
        )}

        {/* EMPTY FILTER STATE */}
        {!isLoading && !errorMessage && processedTrips.length === 0 && (
          <Card className={styles.stateCard} elevated>
            <EmptyState
              title="Chưa có chuyến đi phù hợp"
              message="Không tìm thấy hành trình du lịch nào khớp với bộ lọc tìm kiếm hiện tại."
              actions={
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button onClick={handleOpenPlanner}>Tạo chuyến đi đầu tiên ⚡</Button>
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                    }}
                    variant="secondary"
                  >
                    Xem tất cả
                  </Button>
                </div>
              }
            />
          </Card>
        )}

        {/* DEFAULT TRIPS GRID VIEW */}
        {!isLoading && !errorMessage && processedTrips.length > 0 && (
          <section className={styles.tripGrid} style={viewMode === 'list' ? { gridTemplateColumns: '1fr' } : undefined}>
            {processedTrips.map((trip, idx) => (
              <BounceCard key={trip.id} delay={200 + idx * 80}>
                <Card className={styles.tripCard} elevated interactive>
                  
                  {/* Card Cover Gradient Header */}
                  <div
                    className={styles.cardHeaderCover}
                    style={{ background: getTripHeaderGradient(trip.id) }}
                  >
                    <i className={`material-symbols-outlined ${styles.coverMapIcon}`}>map</i>

                    {/* Days Stamp */}
                    <div className={styles.durationStamp}>
                      {formatDuration(trip)}
                    </div>

                    {/* Status Badge */}
                    <div className={styles.statusBadge}>
                      <Badge
                        variant={
                          trip.status === "DRAFT" ? "warn" :
                          trip.status === "PLANNED" ? "info" :
                          trip.status === "COMPLETED" ? "success" : "neutral"
                        }
                        size="sm"
                      >
                        {STATUS_LABELS[trip.status] ?? trip.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className={styles.cardBody}>
                    <h2 className={styles.tripCardTitle}>
                      {buildTripTitle(trip)}
                    </h2>
                    
                    <div className={styles.dateLine}>
                      <i className={`material-symbols-outlined ${styles.dateIcon}`}>calendar_month</i>
                      <span>
                        {formatDate(trip.startDate)} {trip.days && trip.days > 1 ? `– ${getEndDateStr(trip.startDate, trip.days)}` : ""}
                      </span>
                    </div>

                    {/* Specifications Details Grid */}
                    <div className={styles.detailsGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Khởi hành</span>
                        <span className={styles.detailVal}>{trip.destination || "Chưa rõ"}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Ngân sách</span>
                        <span className={styles.detailVal}>
                          {trip.budget === "Tiet kiem" ? "Tiết kiệm" : trip.budget === "Vua phai" ? "Vừa phải" : trip.budget === "Thoai mai" ? "Thoải mái" : "Chưa rõ"}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Phong cách</span>
                        <span className={styles.detailVal}>{trip.travelStyle || "Tự do"}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Cập nhật</span>
                        <span className={styles.detailVal}>{trip.updatedAt ? formatDate(trip.updatedAt) : "—"}</span>
                      </div>
                    </div>

                    {/* User prompt preferences preview */}
                    <p className={styles.preferenceCopy}>
                      {trip.preferences || "Chuyến đi được tạo tự động bởi TripWise AI theo sở thích của bạn."}
                    </p>

                    {/* Tags */}
                    {trip.interests && trip.interests.length > 0 && (
                      <div className={styles.tagsRow}>
                        {trip.interests.slice(0, 3).map((tag) => (
                          <span key={tag} className={styles.tagPill}>
                            #{tag.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className={styles.cardFooterActions}>
                      <Button onClick={() => handleOpenTrip(trip.id)}>Mở chi tiết</Button>
                      <Button
                        disabled={isDeletingId === trip.id}
                        onClick={() => void handleDeleteTrip(trip)}
                        variant="danger"
                      >
                        {isDeletingId === trip.id ? "Đang xóa..." : "Xoá"}
                      </Button>
                    </div>
                  </div>

                </Card>
              </BounceCard>
            ))}
          </section>
        )}

        {/* PAGINATION PANEL */}
        {!isLoading && !errorMessage && (tripPage?.totalPages ?? 0) > 1 && (
          <section className={styles.pagination}>
            <Button
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
              variant="secondary"
            >
              Trang trước
            </Button>

            <div className={styles.paginationDots}>
              {Array.from({ length: tripPage?.totalPages ?? 0 }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentPage(index)}
                  className={`${styles.pageDot} ${
                    index === (tripPage?.page ?? currentPage) ? styles.pageDotActive : ""
                  }`}
                  aria-label={`Đi đến trang ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <Button
              disabled={currentPage >= Math.max((tripPage?.totalPages ?? 0) - 1, 0)}
              onClick={() => setCurrentPage((page) => page + 1)}
              variant="secondary"
            >
              Trang sau
            </Button>
          </section>
        )}

      </div>
    </AppContent>
  );
}
