import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { getAccessToken, getAuthRoles } from "@/lib/api/auth-session";
import { searchAdminPlacesForReview, type AdminPlaceReviewParams } from "@/lib/api/place-client";
import type { AdminPlaceReviewResponse, PageResponse } from "@/lib/api/contracts";
import { ApiError, AuthSessionExpiredError } from "@/lib/api/errors";
import styles from "./AdminPlacesReviewPage.module.css";

type FilterDraft = {
  keyword: string;
  source: string;
  province: string;
  city: string;
  placeType: string;
  verificationStatus: string;
  recommendable: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  keyword: "",
  source: "",
  province: "",
  city: "",
  placeType: "",
  verificationStatus: "",
  recommendable: ""
};

const DEFAULT_PAGE_SIZE = 20;

function toRequestParams(filters: FilterDraft, page: number): AdminPlaceReviewParams {
  return {
    keyword: filters.keyword || undefined,
    source: filters.source || undefined,
    province: filters.province || undefined,
    city: filters.city || undefined,
    placeType: filters.placeType || undefined,
    verificationStatus: filters.verificationStatus || undefined,
    recommendable: filters.recommendable === "" ? undefined : filters.recommendable === "true",
    sortBy: "updatedAt",
    sortDirection: "desc",
    page,
    size: DEFAULT_PAGE_SIZE
  };
}

function mapError(error: unknown) {
  if (error instanceof AuthSessionExpiredError) {
    return "Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Không tải được dữ liệu review địa điểm.";
}

function formatUpdatedAt(value?: string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatLocation(place: AdminPlaceReviewResponse) {
  return [place.ward, place.district, place.city, place.province].filter(Boolean).join(", ");
}

function typeBadgeClass(placeType?: string) {
  switch (placeType) {
    case "ATTRACTION":
      return styles.badgeAttraction;
    case "FOOD":
      return styles.badgeFood;
    case "HOTEL":
      return styles.badgeHotel;
    case "SERVICE":
      return styles.badgeService;
    case "REJECTED":
      return styles.badgeRejected;
    default:
      return styles.badgeNeutral;
  }
}

function statusBadgeClass(status?: string) {
  switch (status) {
    case "PENDING":
      return styles.badgePending;
    case "AUTO_APPROVED":
      return styles.badgeApproved;
    case "VERIFIED":
      return styles.badgeVerified;
    case "REJECTED":
      return styles.badgeRejected;
    default:
      return styles.badgeNeutral;
  }
}

export function AdminPlacesReviewPage() {
  const accessToken = getAccessToken();
  const roles = getAuthRoles();
  const [draftFilters, setDraftFilters] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<PageResponse<AdminPlaceReviewResponse> | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestParams = useMemo(() => toRequestParams(appliedFilters, page), [appliedFilters, page]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const pageResponse = await searchAdminPlacesForReview(requestParams);
        if (!active) {
          return;
        }

        setResults(pageResponse);
        setSelectedPlaceId((current) => {
          const currentExists = pageResponse.content.some((item) => item.id === current);
          if (currentExists) {
            return current;
          }
          return pageResponse.content[0]?.id ?? null;
        });
      } catch (loadError) {
        if (!active) {
          return;
        }
        setResults(null);
        setSelectedPlaceId(null);
        setError(mapError(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [requestParams]);

  if (!accessToken) {
    return <Navigate replace to="/admin/login" />;
  }

  if (roles.length > 0 && !roles.includes("ADMIN")) {
    return <Navigate replace to="/forbidden" />;
  }

  const selectedPlace = results?.content.find((place) => place.id === selectedPlaceId) ?? null;
  const totalElements = results?.totalElements ?? 0;
  const totalPages = results?.totalPages ?? 0;
  const currentPage = results?.page ?? page;

  function updateDraft<K extends keyof FilterDraft>(key: K, value: FilterDraft[K]) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSearch() {
    setPage(0);
    setAppliedFilters(draftFilters);
  }

  function handleReset() {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(0);
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Read-only moderation review</p>
            <h1 className={styles.title}>Places Review</h1>
            <p className={styles.subtitle}>
               Kiểm tra dữ liệu địa điểm public và trạng thái kiểm duyệt trong DB. Màn này chỉ đọc dữ liệu để
               đối chiếu raw import, moderation và public visibility.
            </p>
          </div>

          <div className={styles.heroMeta}>
            <div className={styles.metaCard}>
              <p className={styles.metaLabel}>Kết quả hiện tại</p>
              <p className={styles.metaValue}>{loading ? "..." : totalElements.toLocaleString("vi-VN")}</p>
            </div>
            <div className={styles.metaCard}>
              <p className={styles.metaLabel}>Filter đang áp dụng</p>
              <p className={styles.metaValue}>
                {appliedFilters.city || appliedFilters.province || appliedFilters.source || "Toàn bộ"}
              </p>
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.filtersPanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Bộ lọc review</h2>
              <p className={styles.sectionText}>
                Lọc theo source, province, city, trạng thái kiểm duyệt hoặc từ khóa.
              </p>
            </div>
          </div>

          <div className={styles.filterGrid}>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label htmlFor="review-keyword" className={styles.label}>Keyword</label>
              <input
                id="review-keyword"
                className={styles.input}
                value={draftFilters.keyword}
                onChange={(event) => updateDraft("keyword", event.target.value)}
                placeholder="Tên place, sourceExternalId, địa chỉ..."
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="review-source" className={styles.label}>Source</label>
              <select
                id="review-source"
                className={styles.select}
                value={draftFilters.source}
                onChange={(event) => updateDraft("source", event.target.value)}
              >
                <option value="">All</option>
                <option value="OSM_GEOFABRIK">OSM_GEOFABRIK</option>
                <option value="MANUAL_SEED">MANUAL_SEED</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="review-province" className={styles.label}>Province</label>
              <input
                id="review-province"
                className={styles.input}
                value={draftFilters.province}
                onChange={(event) => updateDraft("province", event.target.value)}
                placeholder="Hồ Chí Minh"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="review-city" className={styles.label}>City</label>
              <input
                id="review-city"
                className={styles.input}
                value={draftFilters.city}
                onChange={(event) => updateDraft("city", event.target.value)}
                placeholder="Ví dụ: Nha Trang"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="review-place-type" className={styles.label}>Place type</label>
              <select
                id="review-place-type"
                className={styles.select}
                value={draftFilters.placeType}
                onChange={(event) => updateDraft("placeType", event.target.value)}
              >
                <option value="">All</option>
                <option value="ATTRACTION">ATTRACTION</option>
                <option value="FOOD">FOOD</option>
                <option value="HOTEL">HOTEL</option>
                <option value="SERVICE">SERVICE</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="review-status" className={styles.label}>Verification status</label>
              <select
                id="review-status"
                className={styles.select}
                value={draftFilters.verificationStatus}
                onChange={(event) => updateDraft("verificationStatus", event.target.value)}
              >
                <option value="">All</option>
                <option value="AUTO_APPROVED">AUTO_APPROVED</option>
                <option value="PENDING">PENDING</option>
                <option value="REJECTED">REJECTED</option>
                <option value="VERIFIED">VERIFIED</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="review-recommendable" className={styles.label}>Recommendable</label>
              <select
                id="review-recommendable"
                className={styles.select}
                value={draftFilters.recommendable}
                onChange={(event) => updateDraft("recommendable", event.target.value)}
              >
                <option value="">All</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleReset} disabled={loading}>
              Reset
            </button>
            <button type="button" className={styles.primaryButton} onClick={handleSearch} disabled={loading}>
              Search
            </button>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <section className={`${styles.panel} ${styles.tablePanel}`}>
            <div className={styles.sectionHeader} style={{ padding: "24px 24px 0" }}>
              <div>
                <h2 className={styles.sectionTitle}>Danh sách địa điểm</h2>
                <p className={styles.sectionText}>
                  Mặc định tải 20 record mỗi trang. Click một dòng để mở panel chi tiết read-only.
                </p>
              </div>
            </div>

            {loading && <div className={styles.loadingState}>Đang tải dữ liệu review...</div>}
            {!loading && error && <div className={styles.errorState}>{error}</div>}
            {!loading && !error && results && results.content.length === 0 && (
              <div className={styles.emptyState}>Không có địa điểm nào khớp với bộ lọc hiện tại.</div>
            )}

            {!loading && !error && results && results.content.length > 0 && (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Source</th>
                        <th>Location</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Recommendable</th>
                        <th>Score</th>
                        <th>Reject reason</th>
                        <th>Updated</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {results.content.map((place) => {
                        const isActive = place.id === selectedPlaceId;

                        return (
                          <tr
                            key={place.id}
                            className={`${styles.tableRow} ${isActive ? styles.tableRowActive : ""}`.trim()}
                            onClick={() => setSelectedPlaceId(place.id)}
                          >
                            <td>
                              <div className={styles.nameCell}>
                                <span className={styles.nameValue}>{place.name}</span>
                                <span className={styles.subtle}>{place.sourceExternalId || `#${place.id}`}</span>
                              </div>
                            </td>
                            <td>{place.source}</td>
                            <td>
                              <div className={styles.locationCell}>
                                <span>{formatLocation(place) || "--"}</span>
                                <span className={styles.subtle}>
                                  {place.latitude?.toFixed(5) ?? "--"}, {place.longitude?.toFixed(5) ?? "--"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${typeBadgeClass(place.placeType)}`}>
                                {place.placeType || "--"}
                              </span>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${statusBadgeClass(place.verificationStatus)}`}>
                                {place.verificationStatus || "--"}
                              </span>
                            </td>
                            <td className={place.recommendable ? styles.recommendableTrue : styles.recommendableFalse}>
                              {place.recommendable ? "true" : "false"}
                            </td>
                            <td>{place.qualityScore ?? "--"}</td>
                            <td className={styles.rejectCell}>{place.rejectReason || "--"}</td>
                            <td>{formatUpdatedAt(place.updatedAt)}</td>
                            <td>
                              <button
                                type="button"
                                className={styles.viewButton}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedPlaceId(place.id);
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.pagination}>
                  <div className={styles.paginationMeta}>
                    Trang {currentPage + 1} / {Math.max(totalPages, 1)} • {totalElements.toLocaleString("vi-VN")} kết quả
                  </div>

                  <div className={styles.paginationActions}>
                    <button
                      type="button"
                      className={styles.pagerButton}
                      onClick={() => setPage((current) => Math.max(current - 1, 0))}
                      disabled={loading || currentPage <= 0}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className={styles.pagerButton}
                      onClick={() => setPage((current) => current + 1)}
                      disabled={loading || totalPages === 0 || currentPage >= totalPages - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className={`${styles.panel} ${styles.detailPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Chi tiết địa điểm</h2>
                <p className={styles.sectionText}>Panel này chỉ hiển thị dữ liệu moderation/read model, không có action chỉnh sửa.</p>
              </div>
            </div>

            {!selectedPlace && <p className={styles.emptyDetail}>Chọn một địa điểm trong bảng để xem tags, rawTags, tọa độ và reject reason.</p>}

            {selectedPlace && (
              <div className={styles.detailBlock}>
                <div className={styles.detailHeader}>
                  <h3 className={styles.detailTitle}>{selectedPlace.name}</h3>
                  <div className={styles.detailMeta}>
                    <span className={`${styles.badge} ${typeBadgeClass(selectedPlace.placeType)}`}>
                      {selectedPlace.placeType || "--"}
                    </span>
                    <span className={`${styles.badge} ${statusBadgeClass(selectedPlace.verificationStatus)}`}>
                      {selectedPlace.verificationStatus || "--"}
                    </span>
                    <span className={`${styles.badge} ${selectedPlace.recommendable ? styles.badgeApproved : styles.badgeRejected}`}>
                      recommendable={selectedPlace.recommendable ? "true" : "false"}
                    </span>
                  </div>
                </div>

                <div className={styles.detailList}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Location</span>
                    <span className={styles.detailValue}>{formatLocation(selectedPlace) || "--"}</span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Lat / Lng</span>
                    <span className={styles.detailValue}>
                      {selectedPlace.latitude ?? "--"} / {selectedPlace.longitude ?? "--"}
                    </span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Source external ID</span>
                    <span className={styles.detailValue}>{selectedPlace.sourceExternalId || "--"}</span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Duration minutes</span>
                    <span className={styles.detailValue}>{selectedPlace.durationMinutes ?? "--"}</span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Quality score</span>
                    <span className={styles.detailValue}>{selectedPlace.qualityScore ?? "--"}</span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Reject reason</span>
                    <span className={styles.detailValue}>{selectedPlace.rejectReason || "--"}</span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Tags</span>
                    {selectedPlace.tags && selectedPlace.tags.length > 0 ? (
                      <div className={styles.tagList}>
                        {selectedPlace.tags.map((tag) => (
                          <span key={tag} className={styles.tagChip}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.detailValue}>--</span>
                    )}
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Raw tags</span>
                    <span className={styles.detailValue}>{selectedPlace.rawTags || "--"}</span>
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Updated</span>
                    <span className={styles.detailValue}>{formatUpdatedAt(selectedPlace.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
